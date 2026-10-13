revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function
  private.has_family_role, private.is_family_member, private.can_edit_family,
  private.my_family_ids, private.my_editor_family_ids, private.my_owner_family_ids,
  private.my_baby_ids, private.my_editor_baby_ids, private.text_array, private.valid_foods,
  private.lock_running_session, private.save_sleep_details, private.save_bottle_details,
  private.save_nappy_details, private.save_pump_details, private.save_growth_details,
  private.save_solids_details, private.save_custom_details, private.save_segments
to authenticated;

alter default privileges in schema private revoke execute on functions from public, anon, authenticated;
