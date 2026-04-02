import { handleAdminApi } from "../server/adminApi.mjs";

export default async function handler(req, res) {
  return handleAdminApi(req, res);
}
