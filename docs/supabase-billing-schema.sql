-- SAYNUE Paddle Sandbox: server-owned entitlements (Supabase Postgres).
-- MANUAL SETUP ONLY. Run once in Supabase SQL editor, after a project is created.
-- Never place a service_role key in the browser or GitHub.
BEGIN;

CREATE TABLE IF NOT EXISTS public.saynue_checkout_intents (
  transaction_id text PRIMARY KEY CHECK (transaction_id ~ '^txn_[a-z0-9]{10,64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_id text NOT NULL CHECK (price_id ~ '^pri_[a-z0-9]{10,64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saynue_checkout_intents_user_idx
  ON public.saynue_checkout_intents(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.saynue_subscriptions (
  subscription_id text PRIMARY KEY CHECK (subscription_id ~ '^sub_[a-z0-9]{10,64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL CHECK (customer_id ~ '^ctm_[a-z0-9]{10,64}$'),
  price_id text NOT NULL CHECK (price_id ~ '^pri_[a-z0-9]{10,64}$'),
  status text NOT NULL CHECK (status IN ('active','trialing','past_due','paused','canceled')),
  period_end timestamptz,
  billing_blocked boolean NOT NULL DEFAULT false,
  last_event_at timestamptz NOT NULL,
  last_event_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saynue_subscriptions ADD COLUMN IF NOT EXISTS billing_blocked boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS saynue_subscriptions_user_idx
  ON public.saynue_subscriptions(user_id,status,period_end DESC);

CREATE TABLE IF NOT EXISTS public.saynue_webhook_events (
  event_id text PRIMARY KEY,
  subscription_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saynue_webhook_events_sub_idx
  ON public.saynue_webhook_events(subscription_id,occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.saynue_plus_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  calls integer NOT NULL DEFAULT 0 CHECK (calls >= 0),
  PRIMARY KEY (user_id,usage_date)
);

-- No direct access to billing records, even from a logged-in browser.
ALTER TABLE public.saynue_checkout_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saynue_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saynue_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saynue_plus_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.saynue_checkout_intents, public.saynue_subscriptions,
  public.saynue_webhook_events, public.saynue_plus_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saynue_checkout_intents, public.saynue_subscriptions,
  public.saynue_webhook_events, public.saynue_plus_usage TO service_role;

-- This function performs dedupe, subscription ownership binding and event-time
-- ordering in a SINGLE Postgres transaction, including retries/concurrency.
CREATE OR REPLACE FUNCTION public.saynue_apply_subscription_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_subscription_id text,
  p_status text,
  p_customer_id text,
  p_price_id text,
  p_transaction_id text,
  p_period_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_existing public.saynue_subscriptions%ROWTYPE;
  v_expected_price text;
  v_applied boolean := false;
BEGIN
  IF p_event_id !~ '^evt_[a-z0-9]{10,64}$'
     OR p_subscription_id !~ '^sub_[a-z0-9]{10,64}$'
     OR p_status NOT IN ('active','trialing','past_due','paused','canceled')
     OR p_customer_id !~ '^ctm_[a-z0-9]{10,64}$'
     OR p_price_id !~ '^pri_[a-z0-9]{10,64}$'
     OR p_event_type NOT IN ('subscription.created','subscription.updated',
       'subscription.activated','subscription.trialing','subscription.past_due',
       'subscription.paused','subscription.resumed','subscription.canceled')
     OR p_occurred_at IS NULL
  THEN
    RAISE EXCEPTION 'invalid_subscription_event';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_subscription_id));

  IF EXISTS (SELECT 1 FROM public.saynue_webhook_events WHERE event_id=p_event_id) THEN
    RETURN jsonb_build_object('state','duplicate');
  END IF;

  SELECT * INTO v_existing FROM public.saynue_subscriptions WHERE subscription_id=p_subscription_id FOR UPDATE;
  IF FOUND THEN
    v_user_id := v_existing.user_id;
  ELSE
    -- Critical: never trust user_id/email/custom_data from the webhook/browser
    -- alone. New subscriptions MUST reference a transaction we created
    -- for a verified server-side user and stored before checkout started.
    IF p_event_type <> 'subscription.created'
       OR p_transaction_id IS NULL
       OR p_transaction_id !~ '^txn_[a-z0-9]{10,64}$' THEN
      RAISE EXCEPTION 'unlinked_subscription';
    END IF;
    SELECT user_id,price_id INTO v_user_id,v_expected_price
      FROM public.saynue_checkout_intents
      WHERE transaction_id=p_transaction_id
      FOR UPDATE;
    IF v_user_id IS NULL OR v_expected_price IS DISTINCT FROM p_price_id THEN
      RAISE EXCEPTION 'unlinked_subscription';
    END IF;
  END IF;

  -- For equal timestamps, do not overwrite; the first accepted event is kept.
  -- Later reconciliations can correct drift via subscription.updated.
  IF v_existing.subscription_id IS NULL OR p_occurred_at>v_existing.last_event_at THEN
    INSERT INTO public.saynue_subscriptions
      (subscription_id,user_id,customer_id,price_id,status,period_end,last_event_at,last_event_id,updated_at)
    VALUES (p_subscription_id,v_user_id,p_customer_id,p_price_id,p_status,p_period_end,p_occurred_at,p_event_id,now())
    ON CONFLICT (subscription_id) DO UPDATE SET
      customer_id=excluded.customer_id,
      price_id=excluded.price_id,
      status=excluded.status,
      period_end=excluded.period_end,
      last_event_at=excluded.last_event_at,
      last_event_id=excluded.last_event_id,
      updated_at=now()
    WHERE public.saynue_subscriptions.last_event_at<excluded.last_event_at;
    v_applied:=true;
  END IF;

  INSERT INTO public.saynue_webhook_events(event_id,subscription_id,event_type,occurred_at)
  VALUES(p_event_id,p_subscription_id,p_event_type,p_occurred_at);

  RETURN jsonb_build_object('state',CASE WHEN v_applied THEN 'applied' ELSE 'stale' END);
END;
$$;
REVOKE ALL ON FUNCTION public.saynue_apply_subscription_event(text,text,timestamptz,text,text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saynue_apply_subscription_event(text,text,timestamptz,text,text,text,text,text,timestamptz) TO service_role;

-- Approved refunds and chargebacks block further Plus access, including
-- partial refunds. A later subscription.updated never resets this block.
CREATE OR REPLACE FUNCTION public.saynue_apply_adjustment_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_subscription_id text,
  p_transaction_id text,
  p_action text,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $adjustment$
DECLARE
  v_existing text;
BEGIN
  IF p_event_id !~ '^evt_[a-z0-9]{10,64}$'
     OR p_subscription_id !~ '^sub_[a-z0-9]{10,64}$'
     OR p_transaction_id !~ '^txn_[a-z0-9]{10,64}$'
     OR p_event_type NOT IN ('adjustment.created','adjustment.updated')
     OR p_action NOT IN ('refund','chargeback')
     OR p_status <> 'approved'
     OR p_occurred_at IS NULL
  THEN
    RAISE EXCEPTION 'invalid_adjustment_event';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_subscription_id));

  IF EXISTS (SELECT 1 FROM public.saynue_webhook_events WHERE event_id=p_event_id) THEN
    RETURN jsonb_build_object('state','duplicate');
  END IF;

  SELECT subscription_id INTO v_existing
    FROM public.saynue_subscriptions
    WHERE subscription_id=p_subscription_id FOR UPDATE;
  IF v_existing IS NULL THEN
    RAISE EXCEPTION 'unlinked_adjustment';
  END IF;

  UPDATE public.saynue_subscriptions
    SET billing_blocked=true,updated_at=now()
    WHERE subscription_id=p_subscription_id;

  INSERT INTO public.saynue_webhook_events(event_id,subscription_id,event_type,occurred_at)
  VALUES(p_event_id,p_subscription_id,p_event_type,p_occurred_at);
  RETURN jsonb_build_object('state','applied');
END;
$adjustment$;
REVOKE ALL ON FUNCTION public.saynue_apply_adjustment_event(text,text,timestamptz,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saynue_apply_adjustment_event(text,text,timestamptz,text,text,text,text) TO service_role;

-- Atomic paid entitlement + per-user daily quota. Clients cannot claim Plus.
CREATE OR REPLACE FUNCTION public.saynue_claim_plus_credit(p_user_id uuid,p_price_id text,p_daily_limit integer)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NULL OR p_price_id IS NULL OR p_daily_limit < 1 OR p_daily_limit > 25 THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.saynue_subscriptions
      WHERE user_id=p_user_id AND price_id=p_price_id AND status='active' AND NOT billing_blocked AND period_end>now()
  ) THEN
    RETURN false;
  END IF;
  INSERT INTO public.saynue_plus_usage (user_id,usage_date,calls)
    VALUES (p_user_id,(now() AT TIME ZONE 'UTC')::date,1)
    ON CONFLICT (user_id,usage_date) DO UPDATE SET calls=public.saynue_plus_usage.calls+1
    WHERE public.saynue_plus_usage.calls<p_daily_limit
    RETURNING calls INTO v_count;
  RETURN v_count IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.saynue_claim_plus_credit(uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saynue_claim_plus_credit(uuid,text,integer) TO service_role;

-- Return one credit when the AI provider failed (outage, timeout, rejected
-- request). Not used for billed-but-invalid model output. Never below zero.
CREATE OR REPLACE FUNCTION public.saynue_refund_plus_credit(p_user_id uuid,p_usage_date date)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp
AS $refund$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NULL OR p_usage_date IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.saynue_plus_usage
    SET calls=calls-1
    WHERE user_id=p_user_id AND usage_date=p_usage_date AND calls>0
    RETURNING calls INTO v_count;
  RETURN v_count IS NOT NULL;
END;
$refund$;
REVOKE ALL ON FUNCTION public.saynue_refund_plus_credit(uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saynue_refund_plus_credit(uuid,date) TO service_role;

COMMIT;
