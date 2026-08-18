import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../config/api";
import type { Product } from "../types/product";

interface ProductManagementDialogProps {
  onClose: () => void;
}

interface ErrorResponse {
  message?: string;
}

export function ProductManagementDialog({ onClose }: ProductManagementDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadProducts = async (): Promise<void> => {
      try {
        const response = await apiFetch("/products");

        const data = (await response.json()) as Product[] | ErrorResponse;

        if (!response.ok) {
          const errorData = data as ErrorResponse;

          throw new Error(errorData.message ?? "Products could not be loaded.");
        }

        if (!isCancelled) {
          setProducts(data as Product[]);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!isCancelled) {
          const message = error instanceof Error ? error.message : "Products could not be loaded.";

          setErrorMessage(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedCode = code.trim();
    const normalizedName = name.trim();
    const normalizedDescription = description.trim();

    if (normalizedCode === "" || normalizedName === "") {
      setErrorMessage("Product code and name are required.");

      return;
    }

    try {
      setIsSubmitting(true);

      const response = await apiFetch("/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: normalizedCode,
          name: normalizedName,
          ...(normalizedDescription === ""
            ? {}
            : {
                description: normalizedDescription,
              }),
        }),
      });

      const data = (await response.json()) as Product | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;

        throw new Error(errorData.message ?? "Product could not be created.");
      }

      const createdProduct = data as Product;

      setProducts((currentProducts) => [...currentProducts, createdProduct]);

      setCode("");
      setName("");
      setDescription("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product could not be created.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-management-title"
    >
      <div className="mx-auto my-8 w-full max-w-6xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Production Catalog
            </p>

            <h2 id="product-management-title" className="mt-2 text-2xl font-bold text-slate-900">
              Product Management
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Create products that can later be assigned to production work orders.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close product management"
          >
            X
          </button>
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            onSubmit={handleSubmit}
          >
            <h3 className="text-lg font-bold text-slate-900">Add Product</h3>

            <p className="mt-1 text-sm text-slate-500">Product codes must be unique.</p>

            <div className="mt-5">
              <label htmlFor="product-code" className="block text-sm font-semibold text-slate-700">
                Product code
              </label>

              <input
                id="product-code"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={isSubmitting}
                placeholder="Example: PRD-001"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="product-name" className="block text-sm font-semibold text-slate-700">
                Product name
              </label>

              <input
                id="product-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                placeholder="Example: Plastic Cover"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="product-description"
                className="block text-sm font-semibold text-slate-700"
              >
                Description
              </label>

              <textarea
                id="product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
                rows={4}
                placeholder="Optional product description"
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Product"}
            </button>
          </form>

          <section>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Registered Products</h3>

                <p className="mt-1 text-sm text-slate-500">
                  {products.length} product
                  {products.length === 1 ? "" : "s"} registered
                </p>
              </div>
            </div>

            {isLoading && (
              <p className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-600">Loading products...</p>
            )}

            {!isLoading && products.length === 0 && (
              <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                No products have been created yet.
              </p>
            )}

            {!isLoading && products.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Code
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Product
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {products.map((product) => (
                      <tr key={product.id} className="bg-white">
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-emerald-50 px-3 py-1 font-mono text-sm font-bold text-emerald-700">
                            {product.code}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{product.name}</p>

                          <p className="mt-1 max-w-md text-sm text-slate-500">
                            {product.description ?? "No description"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {new Date(product.createdAt).toLocaleDateString("tr-TR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
