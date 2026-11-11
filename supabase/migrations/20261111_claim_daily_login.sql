-- Funzione SQL per claim_daily_login allineata a xp.js
CREATE OR REPLACE FUNCTION public.claim_daily_login()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_profile RECORD;
    today_date date;
    last_login date;
    new_streak int;
    xp_to_award int;
    bonus_reason text;
BEGIN
    -- Verifica utente autenticato
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Utente non autenticato';
    END IF;

    today_date := CURRENT_DATE;

    -- Recupera profilo corrente
    SELECT * INTO user_profile FROM public.profiles WHERE id = current_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profilo non trovato';
    END IF;

    last_login := user_profile.last_login_date;

    -- Controllo riscatto giornaliero
    IF last_login = today_date THEN
        RAISE EXCEPTION 'Hai già riscosso il bonus giornaliero oggi.';
    END IF;

    -- Calcolo streak
    IF last_login = (today_date - INTERVAL '1 day')::date THEN
        new_streak := COALESCE(user_profile.daily_streak, 0) + 1;
    ELSE
        new_streak := 1;
    END IF;

    -- Calcolo XP basato su xp.js
    IF new_streak = 7 OR new_streak = 14 THEN
        xp_to_award := 100;
        bonus_reason := 'Bonus login giornaliero - Giorno ' || new_streak;
    ELSIF new_streak = 30 THEN
        xp_to_award := 250;
        bonus_reason := 'Bonus login giornaliero - Giorno 30';
    ELSE
        xp_to_award := LEAST(10 + (new_streak - 1) * 5, 40);
        bonus_reason := 'Bonus login giornaliero - Giorno ' || new_streak;
    END IF;

    -- Aggiornamento profilo
    UPDATE public.profiles
    SET 
        xp = COALESCE(xp, 0) + xp_to_award,
        daily_streak = new_streak,
        last_login_date = today_date,
        updated_at = NOW()
    WHERE id = current_user_id;

    -- Registrazione evento in xp_events
    INSERT INTO public.xp_events (user_id, event_type, event_key, xp, reason, created_at)
    VALUES (current_user_id, 'daily_login', 'day_' || new_streak, xp_to_award, bonus_reason, NOW());

    RETURN json_build_object(
        'success', true,
        'xp_awarded', xp_to_award,
        'new_streak', new_streak
    );
END;
$$;
