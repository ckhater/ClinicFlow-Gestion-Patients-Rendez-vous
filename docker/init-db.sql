-- Runs once when the PostgreSQL data volume is first initialized.
-- The primary database (POSTGRES_DB) is created automatically by the image.
-- This isolated database is used by the API integration test suite.

CREATE DATABASE clinicflow_test;
