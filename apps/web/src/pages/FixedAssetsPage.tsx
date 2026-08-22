import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ASSET_CONDITION_LABELS,
  AssetCondition,
  FIXED_ASSET_CATEGORY_LABELS,
  FixedAssetCategory,
  type AssetConditionRequestDto,
  type BranchDto,
  type CreateFixedAssetEditRequestInput,
  type FixedAssetDto,
  type FixedAssetEditRequestDto,
} from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { api, ApiError } from "../lib/api";
import { optimizeImage } from "../lib/optimizeImage";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";
import { EditIcon, IconButton } from "../components/icons";

const CONDITION_COLORS: Record<AssetCondition, string> = {
  EXCELLENT: "var(--accent-ink)",
  GOOD: "var(--accent)",
  FAIR: "var(--warn)",
  POOR: "var(--danger)",
  NEEDS_REPAIR: "var(--danger)",
  DISPOSED: "var(--ink-muted)",
};

function formatMoney(amount: number | string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Enter should never submit these multi-field forms early -- only an
// explicit click on the submit button should. Textareas are exempt since
// Enter there means "new line", not "submit".
function blockEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}

interface AssetFormValues {
  name: string;
  category: FixedAssetCategory;
  branchId: string;
  description: string;
  acquisitionDate: string;
  acquisitionCost: string;
  depreciationRatePercent: string;
  conditionAtAcquisition: AssetCondition;
}

function emptyForm(): AssetFormValues {
  return {
    name: "",
    category: FixedAssetCategory.EQUIPMENT,
    branchId: "",
    description: "",
    acquisitionDate: new Date().toISOString().slice(0, 10),
    acquisitionCost: "",
    depreciationRatePercent: "",
    conditionAtAcquisition: AssetCondition.EXCELLENT,
  };
}

function AssetFields({
  values,
  onChange,
  branches,
  currency,
}: {
  values: AssetFormValues;
  onChange: (v: AssetFormValues) => void;
  branches: BranchDto[];
  currency: string;
}) {
  return (
    <>
      <div className="sm:col-span-2">
        <label className="block text-sm mb-1">Name</label>
        <input
          required
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="Main sanctuary land, PA system, church van..."
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Category</label>
        <select
          value={values.category}
          onChange={(e) => onChange({ ...values, category: e.target.value as FixedAssetCategory })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        >
          {Object.entries(FIXED_ASSET_CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Branch</label>
        <select
          value={values.branchId}
          onChange={(e) => onChange({ ...values, branchId: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        >
          <option value="">Org-wide (no specific branch)</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm mb-1">Description</label>
        <input
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Acquisition date</label>
        <input
          required
          type="date"
          value={values.acquisitionDate}
          onChange={(e) => onChange({ ...values, acquisitionDate: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Acquisition cost ({currency})</label>
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={values.acquisitionCost}
          onChange={(e) => onChange({ ...values, acquisitionCost: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Depreciation rate (%/year, optional)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={values.depreciationRatePercent}
          onChange={(e) => onChange({ ...values, depreciationRatePercent: e.target.value })}
          placeholder="Land, for instance, usually has none"
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Condition at acquisition</label>
        <select
          value={values.conditionAtAcquisition}
          onChange={(e) => onChange({ ...values, conditionAtAcquisition: e.target.value as AssetCondition })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        >
          {Object.entries(ASSET_CONDITION_LABELS)
            .filter(([v]) => v !== "DISPOSED")
            .map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
        </select>
      </div>
    </>
  );
}

const PROPOSED_CHANGE_LABELS: Record<string, string> = {
  name: "Name",
  category: "Category",
  branchId: "Branch",
  description: "Description",
  acquisitionDate: "Acquisition date",
  acquisitionCost: "Acquisition cost",
  depreciationRatePercent: "Depreciation rate",
  conditionAtAcquisition: "Condition at acquisition",
};

function formatProposedValue(key: string, value: unknown, branches: BranchDto[]): string {
  if (value == null) return "—";
  if (key === "branchId") return branches.find((b) => b.id === value)?.name ?? "Org-wide";
  if (key === "category") return FIXED_ASSET_CATEGORY_LABELS[value as FixedAssetCategory] ?? String(value);
  if (key === "conditionAtAcquisition") return ASSET_CONDITION_LABELS[value as AssetCondition] ?? String(value);
  if (key === "acquisitionDate") return new Date(value as string).toLocaleDateString(undefined, { dateStyle: "medium" });
  if (key === "depreciationRatePercent") return `${value}%/year`;
  return String(value);
}

function previewRows(values: AssetFormValues, branches: BranchDto[], currency: string) {
  return [
    { label: "Name", value: values.name },
    { label: "Category", value: FIXED_ASSET_CATEGORY_LABELS[values.category] },
    { label: "Branch", value: branches.find((b) => b.id === values.branchId)?.name ?? "Org-wide" },
    { label: "Description", value: values.description },
    { label: "Acquisition date", value: values.acquisitionDate },
    { label: "Acquisition cost", value: values.acquisitionCost ? formatMoney(values.acquisitionCost, currency) : "" },
    { label: "Depreciation rate", value: values.depreciationRatePercent ? `${values.depreciationRatePercent}%/year` : "" },
    { label: "Condition at acquisition", value: ASSET_CONDITION_LABELS[values.conditionAtAcquisition] },
  ];
}

export function FixedAssetsPage() {
  const { org } = useOrg();
  const { user } = useAuth();
  const currency = org?.currency ?? "UGX";

  const [assets, setAssets] = useState<FixedAssetDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [requests, setRequests] = useState<AssetConditionRequestDto[]>([]);
  const [editRequests, setEditRequests] = useState<FixedAssetEditRequestDto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<AssetFormValues>(emptyForm());
  const [confirmingCreate, setConfirmingCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AssetFormValues>(emptyForm());
  const [confirmingEdit, setConfirmingEdit] = useState(false);
  const [requestingEdit, setRequestingEdit] = useState(false);

  const [askingId, setAskingId] = useState<string | null>(null);
  const [askMessage, setAskMessage] = useState("");

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseCondition, setResponseCondition] = useState<AssetCondition>(AssetCondition.GOOD);
  const [responseDescription, setResponseDescription] = useState("");
  const [responsePhotos, setResponsePhotos] = useState<{ id: string; name: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [responding, setResponding] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const MAX_ASSET_PHOTOS = 4;
  const [managingPhotosId, setManagingPhotosId] = useState<string | null>(null);
  const [uploadingAssetPhoto, setUploadingAssetPhoto] = useState(false);
  const [assetPhotoError, setAssetPhotoError] = useState<string | null>(null);
  const assetPhotoInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [a, b, r, e] = await Promise.all([
      api.get<FixedAssetDto[]>("/fixed-assets"),
      api.get<BranchDto[]>("/branches"),
      api.get<AssetConditionRequestDto[]>("/fixed-assets/condition-requests/all"),
      api.get<FixedAssetEditRequestDto[]>("/fixed-assets/edit-requests/all"),
    ]);
    setAssets(a);
    setBranches(b);
    setRequests(r);
    setEditRequests(e);
  }

  useEffect(() => {
    load();
  }, []);

  async function onConfirmCreate() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/fixed-assets", {
        name: form.name,
        category: form.category,
        branchId: form.branchId || undefined,
        description: form.description || undefined,
        acquisitionDate: new Date(form.acquisitionDate).toISOString(),
        acquisitionCost: Number(form.acquisitionCost),
        depreciationRatePercent: form.depreciationRatePercent ? Number(form.depreciationRatePercent) : undefined,
        conditionAtAcquisition: form.conditionAtAcquisition,
      });
      setForm(emptyForm());
      setConfirmingCreate(false);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this asset.");
      setConfirmingCreate(false);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: FixedAssetDto) {
    setEditingAssetId(a.id);
    setEditForm({
      name: a.name,
      category: a.category,
      branchId: a.branchId ?? "",
      description: a.description ?? "",
      acquisitionDate: a.acquisitionDate.slice(0, 10),
      acquisitionCost: a.acquisitionCost,
      depreciationRatePercent: a.depreciationRatePercent != null ? String(a.depreciationRatePercent) : "",
      conditionAtAcquisition: a.conditionAtAcquisition,
    });
  }

  async function onConfirmEdit() {
    if (!editingAssetId) return;
    setRequestingEdit(true);
    setError(null);
    try {
      const input: CreateFixedAssetEditRequestInput = {
        name: editForm.name,
        category: editForm.category,
        branchId: editForm.branchId || undefined,
        description: editForm.description || undefined,
        acquisitionDate: new Date(editForm.acquisitionDate).toISOString(),
        acquisitionCost: Number(editForm.acquisitionCost),
        depreciationRatePercent: editForm.depreciationRatePercent ? Number(editForm.depreciationRatePercent) : undefined,
        conditionAtAcquisition: editForm.conditionAtAcquisition,
      };
      await api.post(`/fixed-assets/${editingAssetId}/edit-requests`, input);
      setEditingAssetId(null);
      setConfirmingEdit(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't file that edit request.");
      setConfirmingEdit(false);
    } finally {
      setRequestingEdit(false);
    }
  }

  async function reviewEdit(id: string, action: "approve" | "reject") {
    try {
      await api.post(`/fixed-assets/edit-requests/${id}/${action}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't review that request.");
    }
  }

  async function onAskCondition(assetId: string) {
    try {
      await api.post(`/fixed-assets/${assetId}/condition-requests`, { message: askMessage || undefined });
      setAskingId(null);
      setAskMessage("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that request.");
    }
  }

  function startResponding(requestId: string) {
    setRespondingId(requestId);
    setResponseCondition(AssetCondition.GOOD);
    setResponseDescription("");
    setResponsePhotos([]);
  }

  async function onUploadAssetPhoto(assetId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setAssetPhotoError(null);
    setUploadingAssetPhoto(true);
    try {
      for (const file of Array.from(files)) {
        const optimized = await optimizeImage(file);
        const uploaded = await api.upload<{ id: string }>("/assets", optimized);
        await api.post(`/fixed-assets/${assetId}/photos`, { assetId: uploaded.id });
      }
      await load();
    } catch (err) {
      setAssetPhotoError(err instanceof ApiError ? err.message : "Photo upload failed.");
    } finally {
      setUploadingAssetPhoto(false);
      if (assetPhotoInputRef.current) assetPhotoInputRef.current.value = "";
    }
  }

  async function onDeleteAssetPhoto(assetId: string, photoId: string) {
    setAssetPhotoError(null);
    try {
      await api.delete(`/fixed-assets/${assetId}/photos/${photoId}`);
      await load();
    } catch (err) {
      setAssetPhotoError(err instanceof ApiError ? err.message : "Couldn't delete that photo.");
    }
  }

  async function onUploadPhoto(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        const optimized = await optimizeImage(file);
        const uploaded = await api.upload<{ id: string; name: string }>("/assets", optimized);
        setResponsePhotos((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Photo upload failed.");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function onSubmitResponse() {
    if (!respondingId) return;
    setResponding(true);
    setError(null);
    try {
      await api.post(`/fixed-assets/condition-requests/${respondingId}/respond`, {
        condition: responseCondition,
        description: responseDescription,
        photoAssetIds: responsePhotos.map((p) => p.id),
      });
      setRespondingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your response.");
    } finally {
      setResponding(false);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const historyRequests = requests.filter((r) => r.status !== "PENDING");
  const pendingEdits = editRequests.filter((r) => r.status === "PENDING");
  const historyEdits = editRequests.filter((r) => r.status !== "PENDING");

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Fixed Assets</h1>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md px-3 py-1.5 text-sm font-medium"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {showForm ? "Cancel" : "+ Add asset"}
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Land, buildings, equipment -- what your church owns, at every branch, with its value and
        current condition. Editing an asset once it's on the register files a request an appointed
        approver has to confirm first.
      </p>

      {error && (
        <div className="rounded-md px-3 py-2 mb-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setConfirmingCreate(true);
          }}
          onKeyDown={blockEnterSubmit}
          className="rounded-xl border p-4 mb-6 grid gap-3 sm:grid-cols-2"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <AssetFields values={form} onChange={setForm} branches={branches} currency={currency} />
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Save asset
            </button>
          </div>
        </form>
      )}

      {confirmingCreate && (
        <ConfirmCreatePreview
          title="Add this asset to the register?"
          confirming={saving}
          onCancel={() => setConfirmingCreate(false)}
          onConfirm={onConfirmCreate}
          rows={previewRows(form, branches, currency)}
        />
      )}

      <div className="rounded-xl border overflow-x-auto mb-8" style={{ borderColor: "var(--line)" }}>
        {assets.length === 0 ? (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>No assets recorded yet.</div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--line)" }}>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Branch</th>
                <th className="text-left font-medium px-4 py-2">Acquired</th>
                <th className="text-left font-medium px-4 py-2">Cost</th>
                <th className="text-left font-medium px-4 py-2">Current value</th>
                <th className="text-left font-medium px-4 py-2">Condition</th>
                <th className="text-left font-medium px-4 py-2">Photos</th>
                <th className="text-right font-medium px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs" style={{ color: "var(--ink-muted)" }}>{FIXED_ASSET_CATEGORY_LABELS[a.category]}</div>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: a.branch ? "var(--ink)" : "var(--ink-muted)" }}>{a.branch?.name ?? "Org-wide"}</td>
                    <td className="px-4 py-2.5">{new Date(a.acquisitionDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                    <td className="px-4 py-2.5">{formatMoney(a.acquisitionCost, a.currency)}</td>
                    <td className="px-4 py-2.5 font-medium">{formatMoney(a.currentValue, a.currency)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium" style={{ color: CONDITION_COLORS[a.currentCondition] }}>
                        {ASSET_CONDITION_LABELS[a.currentCondition]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setManagingPhotosId(managingPhotosId === a.id ? null : a.id);
                          setAssetPhotoError(null);
                        }}
                        className="flex items-center gap-1"
                        title="Manage photos"
                      >
                        {a.photos.slice(0, 4).map((p) => (
                          <img
                            key={p.id}
                            src={`/api/assets/${p.asset.id}/file`}
                            alt=""
                            className="rounded object-cover"
                            style={{ width: 24, height: 24, border: "1px solid var(--line)" }}
                          />
                        ))}
                        {a.photos.length === 0 && (
                          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Add</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {askingId === a.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              value={askMessage}
                              onChange={(e) => setAskMessage(e.target.value)}
                              placeholder="Optional note"
                              className="rounded-md border px-2 py-1 text-xs w-32"
                              style={{ borderColor: "var(--line)" }}
                            />
                            <button type="button" onClick={() => onAskCondition(a.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>Send</button>
                            <button type="button" onClick={() => setAskingId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>Cancel</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAskingId(a.id)}
                            className="rounded-md px-2.5 py-1 text-xs font-medium"
                            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                          >
                            Ask for state
                          </button>
                        )}
                        <IconButton title="Request an edit" onClick={() => startEdit(a)}>
                          <EditIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                  {managingPhotosId === a.id && (
                    <tr style={{ borderColor: "var(--line-soft)" }}>
                      <td colSpan={8} className="px-4 py-3" style={{ background: "var(--surface-2)" }}>
                        <div className="flex flex-wrap items-center gap-3">
                          {a.photos.map((p) => (
                            <div key={p.id} className="relative">
                              <img
                                src={`/api/assets/${p.asset.id}/file`}
                                alt=""
                                className="rounded object-cover"
                                style={{ width: 72, height: 72, border: "1px solid var(--line)" }}
                              />
                              <button
                                type="button"
                                onClick={() => onDeleteAssetPhoto(a.id, p.id)}
                                title="Delete this photo"
                                className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center text-xs font-semibold"
                                style={{ width: 18, height: 18, background: "var(--danger)", color: "white" }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {a.photos.length < MAX_ASSET_PHOTOS ? (
                            <button
                              type="button"
                              disabled={uploadingAssetPhoto}
                              onClick={() => assetPhotoInputRef.current?.click()}
                              className="rounded-md border-2 border-dashed flex items-center justify-center text-xs disabled:opacity-60"
                              style={{ width: 72, height: 72, borderColor: "var(--line)", color: "var(--ink-muted)" }}
                            >
                              {uploadingAssetPhoto ? "Uploading…" : "+ Add"}
                            </button>
                          ) : (
                            <p className="text-xs max-w-[10rem]" style={{ color: "var(--ink-muted)" }}>
                              Up to {MAX_ASSET_PHOTOS} photos -- delete one above to add another.
                            </p>
                          )}
                        </div>
                        <input
                          ref={assetPhotoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onUploadAssetPhoto(a.id, e.target.files)}
                        />
                        {assetPhotoError && (
                          <div className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
                            {assetPhotoError}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  {editingAssetId === a.id && (
                    <tr style={{ borderColor: "var(--line-soft)" }}>
                      <td colSpan={8} className="px-4 py-3" style={{ background: "var(--surface-2)" }}>
                        <form
                          onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            setConfirmingEdit(true);
                          }}
                          onKeyDown={blockEnterSubmit}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          <AssetFields values={editForm} onChange={setEditForm} branches={branches} currency={currency} />
                          <div className="sm:col-span-2 flex gap-2">
                            <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
                              Request this edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAssetId(null)}
                              className="rounded-md px-4 py-2 text-sm font-medium"
                              style={{ background: "var(--surface)", color: "var(--ink)" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmingEdit && (
        <ConfirmCreatePreview
          title="File this edit request?"
          confirming={requestingEdit}
          onCancel={() => setConfirmingEdit(false)}
          onConfirm={onConfirmEdit}
          rows={previewRows(editForm, branches, currency)}
        />
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Pending edit requests ({pendingEdits.length})
      </h2>
      <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--line)" }}>
        {pendingEdits.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>Nothing waiting.</div>
        )}
        {pendingEdits.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{r.fixedAsset?.name}</div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Proposed by {r.requestedBy?.fullName}
                  {r.note && ` -- "${r.note}"`}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                  {Object.entries(r.proposedChanges)
                    .map(([k, v]) => `${PROPOSED_CHANGE_LABELS[k] ?? k}: ${formatProposedValue(k, v, branches)}`)
                    .join(" · ")}
                </div>
              </div>
              {user?.id === r.requestedById ? (
                <span className="text-xs shrink-0" style={{ color: "var(--ink-muted)" }}>
                  You filed this -- another approver needs to review it.
                </span>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => reviewEdit(r.id, "approve")}
                    className="rounded-md px-3 py-1.5 text-xs font-medium"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewEdit(r.id, "reject")}
                    className="rounded-md px-3 py-1.5 text-xs font-medium"
                    style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Pending condition checks ({pendingRequests.length})
      </h2>
      <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--line)" }}>
        {pendingRequests.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>Nothing waiting.</div>
        )}
        {pendingRequests.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{r.fixedAsset?.name}</div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Asked by {r.requestedBy?.fullName} {r.fixedAsset?.branch ? `· ${r.fixedAsset.branch.name}` : ""}
                  {r.message && ` -- "${r.message}"`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => startResponding(r.id)}
                className="rounded-md px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Respond
              </button>
            </div>

            {respondingId === r.id && (
              <div className="mt-3 rounded-md border p-3 grid gap-2" style={{ borderColor: "var(--line)" }}>
                <select value={responseCondition} onChange={(e) => setResponseCondition(e.target.value as AssetCondition)} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                  {Object.entries(ASSET_CONDITION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <textarea
                  required
                  value={responseDescription}
                  onChange={(e) => setResponseDescription(e.target.value)}
                  placeholder="Describe the current state"
                  rows={2}
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
                <div>
                  <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => onUploadPhoto(e.target.files)} />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                    style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                  >
                    {uploadingPhoto ? "Uploading…" : "+ Add photos"}
                  </button>
                  {responsePhotos.length > 0 && (
                    <span className="text-xs ml-2" style={{ color: "var(--ink-muted)" }}>
                      {responsePhotos.length} photo{responsePhotos.length === 1 ? "" : "s"} attached
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={responding || !responseDescription.trim()}
                    onClick={onSubmitResponse}
                    className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    {responding ? "Submitting…" : "Submit response"}
                  </button>
                  <button type="button" onClick={() => setRespondingId(null)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        History
      </h2>
      <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--line)" }}>
        {historyRequests.length === 0 && historyEdits.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>Nothing reviewed yet.</div>
        )}
        {historyEdits.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Edit -- {r.fixedAsset?.name}</div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Proposed by {r.requestedBy?.fullName} · reviewed by {r.reviewedBy?.fullName ?? "—"}
                </div>
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: r.status === "APPROVED" ? "var(--accent-ink)" : "var(--danger)" }}
              >
                {r.status === "APPROVED" ? "Approved" : "Rejected"}
              </span>
            </div>
          </div>
        ))}
        {historyRequests.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{r.fixedAsset?.name}</div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {r.responseDescription} -- by {r.respondedBy?.fullName}
                </div>
              </div>
              <span className="text-xs font-medium" style={{ color: r.responseCondition ? CONDITION_COLORS[r.responseCondition] : undefined }}>
                {r.responseCondition ? ASSET_CONDITION_LABELS[r.responseCondition] : ""}
              </span>
            </div>
            {r.photos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {r.photos.map((p) => (
                  <a key={p.id} href={`/api/assets/${p.asset.id}/file`} target="_blank" rel="noreferrer">
                    <img src={`/api/assets/${p.asset.id}/file`} alt={p.asset.name} className="rounded-md object-cover" style={{ width: 64, height: 64 }} />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
