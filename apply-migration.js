import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://lqhlftconhnffznriybc.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
    console.log('Please run: SUPABASE_SERVICE_KEY=your_service_role_key node apply-migration.js');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
    try {
        console.log('📖 Reading migration file...');
        const migrationSQL = readFileSync(
            join(__dirname, 'supabase/migrations/FIX_MISSING_SCHEMA_20260120.sql'),
            'utf-8'
        );

        console.log('🚀 Applying migration...');
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration applied successfully!');
        console.log('🔄 Please refresh your application to see the changes.');
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

applyMigration();
