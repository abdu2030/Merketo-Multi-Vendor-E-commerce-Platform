// All services and identities in this suite belong to the disposable local database.
const api = "http://127.0.0.1:15131/api";
const web = "http://127.0.0.1:15130";
const database = "postgresql://postgres:local_day13_fixture@127.0.0.1:15438/marketotest?sslmode=disable";
const webhookSecret = "whsec_local_browser_fixture";
module.exports = { api, web, database, webhookSecret };
