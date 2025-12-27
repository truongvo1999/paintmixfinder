export const isAdminAuthorized = (request: Request) => {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const adminKey = process.env.ADMIN_IMPORT_KEY;
  return Boolean(adminKey && key === adminKey);
};

export const unauthorizedResponse = () =>
  Response.json({ error: "admin.errors.unauthorized" }, { status: 401 });
