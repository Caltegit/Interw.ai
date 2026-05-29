UPDATE public.projects
SET report_recipient_user_ids = ARRAY[created_by]
WHERE cardinality(report_recipient_user_ids) = 0;