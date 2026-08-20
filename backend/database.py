from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[WARN] Supabase URL or Service Role Key missing in .env")

# Initialize Supabase with service role key to allow admin database reads/writes
supabase_admin: Client = create_client(
    SUPABASE_URL, 
    SUPABASE_SERVICE_ROLE_KEY
) if (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) else None
