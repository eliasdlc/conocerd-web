import { describe, expect, it, vi } from "vitest";
import { forwardAccountDeletion, type FetchAccountDeletion } from "./proxy";

describe("forwardAccountDeletion", () => {
  it("reenvía solo el bearer al endpoint publicado", async () => {
    const upstream = vi.fn<FetchAccountDeletion>(async () =>
      Response.json({ deleted: true }, { status: 200 }),
    );

    const response = await forwardAccountDeletion({
      apiUrl: "https://api.example.com",
      authorization: "Bearer id-token",
      fetchAccountDeletion: upstream,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(upstream).toHaveBeenCalledOnce();
    expect(upstream).toHaveBeenCalledWith(
      new URL("https://api.example.com/account-delete"),
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: "Bearer id-token",
        },
        cache: "no-store",
      },
    );
    expect(upstream.mock.calls[0]?.[1]?.body).toBeUndefined();
  });

  it("rechaza solicitudes sin sesión antes de llamar al API", async () => {
    const upstream = vi.fn<FetchAccountDeletion>();
    const response = await forwardAccountDeletion({
      apiUrl: "https://api.example.com",
      fetchAccountDeletion: upstream,
    });

    expect(response.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("informa cuando falta el dominio del API", async () => {
    const response = await forwardAccountDeletion({
      authorization: "Bearer id-token",
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "La eliminación de cuenta aún no está configurada en este sitio.",
    });
  });
});
