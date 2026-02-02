
  create table "public"."notification_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "body" text not null,
    "url" text,
    "priority" text default 'normal'::text,
    "created_at" timestamp with time zone default now(),
    "delivered_at" timestamp with time zone
      );


alter table "public"."notification_events" enable row level security;


  create table "public"."user_settings" (
    "user_id" uuid not null,
    "notif_community" boolean default true,
    "notif_trips" boolean default true,
    "notif_budget" boolean default false,
    "digest_hour" smallint default 18,
    "last_digest_at" timestamp with time zone,
    "last_budget_alert_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_settings" enable row level security;

CREATE UNIQUE INDEX notification_events_pkey ON public.notification_events USING btree (id);

CREATE UNIQUE INDEX user_settings_pkey ON public.user_settings USING btree (user_id);

alter table "public"."notification_events" add constraint "notification_events_pkey" PRIMARY KEY using index "notification_events_pkey";

alter table "public"."user_settings" add constraint "user_settings_pkey" PRIMARY KEY using index "user_settings_pkey";

alter table "public"."notification_events" add constraint "notification_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notification_events" validate constraint "notification_events_user_id_fkey";

alter table "public"."user_settings" add constraint "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_settings" validate constraint "user_settings_user_id_fkey";

grant delete on table "public"."notification_events" to "anon";

grant insert on table "public"."notification_events" to "anon";

grant references on table "public"."notification_events" to "anon";

grant select on table "public"."notification_events" to "anon";

grant trigger on table "public"."notification_events" to "anon";

grant truncate on table "public"."notification_events" to "anon";

grant update on table "public"."notification_events" to "anon";

grant delete on table "public"."notification_events" to "authenticated";

grant insert on table "public"."notification_events" to "authenticated";

grant references on table "public"."notification_events" to "authenticated";

grant select on table "public"."notification_events" to "authenticated";

grant trigger on table "public"."notification_events" to "authenticated";

grant truncate on table "public"."notification_events" to "authenticated";

grant update on table "public"."notification_events" to "authenticated";

grant delete on table "public"."notification_events" to "service_role";

grant insert on table "public"."notification_events" to "service_role";

grant references on table "public"."notification_events" to "service_role";

grant select on table "public"."notification_events" to "service_role";

grant trigger on table "public"."notification_events" to "service_role";

grant truncate on table "public"."notification_events" to "service_role";

grant update on table "public"."notification_events" to "service_role";

grant delete on table "public"."user_settings" to "anon";

grant insert on table "public"."user_settings" to "anon";

grant references on table "public"."user_settings" to "anon";

grant select on table "public"."user_settings" to "anon";

grant trigger on table "public"."user_settings" to "anon";

grant truncate on table "public"."user_settings" to "anon";

grant update on table "public"."user_settings" to "anon";

grant delete on table "public"."user_settings" to "authenticated";

grant insert on table "public"."user_settings" to "authenticated";

grant references on table "public"."user_settings" to "authenticated";

grant select on table "public"."user_settings" to "authenticated";

grant trigger on table "public"."user_settings" to "authenticated";

grant truncate on table "public"."user_settings" to "authenticated";

grant update on table "public"."user_settings" to "authenticated";

grant delete on table "public"."user_settings" to "service_role";

grant insert on table "public"."user_settings" to "service_role";

grant references on table "public"."user_settings" to "service_role";

grant select on table "public"."user_settings" to "service_role";

grant trigger on table "public"."user_settings" to "service_role";

grant truncate on table "public"."user_settings" to "service_role";

grant update on table "public"."user_settings" to "service_role";


  create policy "Users view own notifications"
  on "public"."notification_events"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users manage own settings"
  on "public"."user_settings"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


