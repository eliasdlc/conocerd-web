import { forwardAccountDeletion } from "@/lib/account-deletion/proxy";

// El borrado en el API puede tardar (Storage, lotes, borrado recursivo); el
// proxy espera al menos lo mismo que declara el API.
export const maxDuration = 60;

export async function POST(request: Request) {
  return forwardAccountDeletion({
    apiUrl: process.env.CONOCERD_API_URL,
    authorization: request.headers.get("authorization"),
  });
}
