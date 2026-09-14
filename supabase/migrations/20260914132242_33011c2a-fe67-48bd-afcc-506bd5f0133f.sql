-- Réécriture des adresses d'images/vidéos publiques vers le service serveur
-- (le stockage devient privé ; seuls les dossiers vitrine restent servis).
DO $$
DECLARE
  old_p text := 'https://qxszgsxdktnwqabsdfvw.supabase.co/storage/v1/object/public/media/';
  new_p text := 'https://qxszgsxdktnwqabsdfvw.supabase.co/functions/v1/public-asset/';
BEGIN
  UPDATE organizations SET logo_url = replace(logo_url, old_p, new_p) WHERE logo_url LIKE old_p || '%' AND logo_url NOT LIKE old_p || 'interviews/%';

  UPDATE projects SET
    avatar_image_url = CASE WHEN avatar_image_url LIKE old_p || '%' AND avatar_image_url NOT LIKE old_p || 'interviews/%' THEN replace(avatar_image_url, old_p, new_p) ELSE avatar_image_url END,
    intro_audio_url = CASE WHEN intro_audio_url LIKE old_p || '%' AND intro_audio_url NOT LIKE old_p || 'interviews/%' THEN replace(intro_audio_url, old_p, new_p) ELSE intro_audio_url END,
    presentation_video_url = CASE WHEN presentation_video_url LIKE old_p || '%' AND presentation_video_url NOT LIKE old_p || 'interviews/%' THEN replace(presentation_video_url, old_p, new_p) ELSE presentation_video_url END;

  UPDATE questions SET
    audio_url = CASE WHEN audio_url LIKE old_p || '%' AND audio_url NOT LIKE old_p || 'interviews/%' THEN replace(audio_url, old_p, new_p) ELSE audio_url END,
    video_url = CASE WHEN video_url LIKE old_p || '%' AND video_url NOT LIKE old_p || 'interviews/%' THEN replace(video_url, old_p, new_p) ELSE video_url END,
    avatar_image_url = CASE WHEN avatar_image_url LIKE old_p || '%' AND avatar_image_url NOT LIKE old_p || 'interviews/%' THEN replace(avatar_image_url, old_p, new_p) ELSE avatar_image_url END;

  UPDATE question_templates SET
    audio_url = CASE WHEN audio_url LIKE old_p || '%' THEN replace(audio_url, old_p, new_p) ELSE audio_url END,
    video_url = CASE WHEN video_url LIKE old_p || '%' THEN replace(video_url, old_p, new_p) ELSE video_url END,
    avatar_image_url = CASE WHEN avatar_image_url LIKE old_p || '%' THEN replace(avatar_image_url, old_p, new_p) ELSE avatar_image_url END;

  UPDATE interview_templates SET
    avatar_image_url = CASE WHEN avatar_image_url LIKE old_p || '%' THEN replace(avatar_image_url, old_p, new_p) ELSE avatar_image_url END,
    intro_audio_url = CASE WHEN intro_audio_url LIKE old_p || '%' THEN replace(intro_audio_url, old_p, new_p) ELSE intro_audio_url END,
    presentation_video_url = CASE WHEN presentation_video_url LIKE old_p || '%' THEN replace(presentation_video_url, old_p, new_p) ELSE presentation_video_url END;

  UPDATE interview_template_questions SET
    audio_url = CASE WHEN audio_url LIKE old_p || '%' THEN replace(audio_url, old_p, new_p) ELSE audio_url END,
    video_url = CASE WHEN video_url LIKE old_p || '%' THEN replace(video_url, old_p, new_p) ELSE video_url END,
    avatar_image_url = CASE WHEN avatar_image_url LIKE old_p || '%' THEN replace(avatar_image_url, old_p, new_p) ELSE avatar_image_url END;

  UPDATE intro_templates SET
    audio_url = CASE WHEN audio_url LIKE old_p || '%' THEN replace(audio_url, old_p, new_p) ELSE audio_url END,
    video_url = CASE WHEN video_url LIKE old_p || '%' THEN replace(video_url, old_p, new_p) ELSE video_url END;

  UPDATE project_public_pages SET
    cover_image_url = CASE WHEN cover_image_url LIKE old_p || '%' THEN replace(cover_image_url, old_p, new_p) ELSE cover_image_url END,
    content = replace(content::text, old_p, new_p)::jsonb
  WHERE content::text LIKE '%' || old_p || '%' OR cover_image_url LIKE old_p || '%';
END $$;