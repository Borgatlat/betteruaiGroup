-- Create function to delete user account and all associated data
create or replace function delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid;
begin
  -- Get the current user's ID
  user_id := auth.uid();
  
  -- Delete user's data from all tables
  delete from calorie_tracking where profile_id = user_id;
  delete from water_tracking where profile_id = user_id;
  delete from workout_kudos where workout_kudos.user_id = user_id;
  delete from mental_kudos where mental_kudos.user_id = user_id;
  delete from run_kudos where run_kudos.user_id = user_id;
  delete from friendships where friendships.user_id = user_id or friendships.friend_id = user_id;
  delete from profiles where profiles.id = user_id;
  
  -- Delete the user's auth account
  delete from auth.users where id = user_id;
end;
$$; 