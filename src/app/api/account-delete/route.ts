import { forwardAccountDeletion } from "@/lib/account-deletion/proxy";

export async function POST(request: Request) {
  return forwardAccountDeletion({
    apiUrl: process.env.CONOCERD_API_URL,
    authorization: request.headers.get("authorization"),
  });
}
