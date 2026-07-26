-- Update get_whatsapp_settings to also return stk_enabled
CREATE OR REPLACE FUNCTION public.get_whatsapp_settings()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_phone text := '';
  v_group text := '';
  v_stk text := 'true';
begin
  select setting_value into v_phone from public.app_settings where setting_key = 'whatsapp_phone';
  select setting_value into v_group from public.app_settings where setting_key = 'whatsapp_group_link';
  select setting_value into v_stk from public.app_settings where setting_key = 'stk_enabled';
  return json_build_object(
    'whatsapp_phone', coalesce(v_phone, ''),
    'whatsapp_group_link', coalesce(v_group, ''),
    'stk_enabled', coalesce(v_stk, 'true')
  );
end;
$function$
;
