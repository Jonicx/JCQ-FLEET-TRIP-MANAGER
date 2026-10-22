import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_KXrOT6gMEV2A@ep-old-wind-b4jbelki-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function activateUser() {
  try {
    const result = await pool.query(
      'UPDATE app_users SET is_active = true WHERE email = $1 RETURNING *',
      ['havugimana.jonathan4@gmail.com']
    );
    console.log('Updated user:', result.rows[0]);
    console.log('Account activated successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

activateUser();
