#!/bin/bash
# Invoke local send-invite-email Edge Function (use Publishable key from supabase status)
curl -X POST http://127.0.0.1:54321/functions/v1/send-invite-email \
  -H "Authorization: Bearer sb_publishable_ACJWlzQHlZjBrEguHvf0xg_3BJgxAaH" \
  -H "Content-Type: application/json" \
  -d '{
    "invited_email": "braydon@uni.minerva.edu",
    "inviter_name": "Brady",
    "group_name": "Test Group"
  }'
