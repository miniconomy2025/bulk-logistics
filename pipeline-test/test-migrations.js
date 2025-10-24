const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '.env')
});
const { execSync } = require('child_process');

const requiredEnvVars = ['PGHOST', 'PGUSER', 'PGDATABASE', 'PGPASSWORD'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');

execSync(`psql -h ${process.env.PGHOST} -U ${process.env.PGUSER} -d ${process.env.PGDATABASE} -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
  );"`, { stdio: 'inherit' });

const migrationsDir = path.join(projectRoot, 'migration');
const files = execSync(`find "${migrationsDir}" -name "*.sql" -type f`, { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean)
  .sort();

for (const file of files) {
  const filename = path.basename(file);
  console.log(`Applying migration ${filename}`);
  execSync(`psql -h ${process.env.PGHOST} -U ${process.env.PGUSER} -d ${process.env.PGDATABASE} -f "${file}"`, 
    { stdio: 'inherit' });
}