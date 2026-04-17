import React, { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAdminActionMutation, useAdminFetchQuery } from "../../../store/adminApi";
import { showErrorMessage, showSuccessAlert } from "../../utils/alerts";

const emptyConfig = {
  id: null,
  type: "steadfast",
  url: "",
  status: 0,
  api_key: "",
  secret_key: "",
  has_api_key: false,
  has_secret_key: false,
};

const SteadfastSettings = () => {
  const tagKey = "steadfast-settings";
  const { data: response } = useAdminFetchQuery({
    url: "/admin/integrations/steadfast",
    tags: [tagKey, "settings"],
  });
  const [adminAction] = useAdminActionMutation();
  const [form, setForm] = useState(emptyConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!response?.success || !response?.data) return;

    setForm((prev) => ({
      ...prev,
      ...response.data,
      api_key: "",
      secret_key: "",
    }));
  }, [response]);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const result = await adminAction({
        url: "/admin/integrations/steadfast",
        method: "POST",
        body: {
          status: Number(form.status) === 1,
          url: form.url || "",
          api_key: form.api_key || "",
          secret_key: form.secret_key || "",
        },
        invalidates: [tagKey, "settings"],
        notifySuccess: false,
      }).unwrap();

      setForm((prev) => ({
        ...prev,
        ...(result?.data || {}),
        api_key: "",
        secret_key: "",
      }));

      showSuccessAlert({
        title: "Saved",
        content: result?.message || "Steadfast configuration saved successfully.",
      });
    } catch (error) {
      showErrorMessage(
        error?.data?.message || "Failed to save Steadfast configuration.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Steadfast Settings
            </h2>
            <p className="text-sm text-gray-500">
              Configure only the Steadfast courier credentials used by admin
              order dispatch.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Stored securely
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={Number(form.status) === 1 ? 1 : 0}
              onChange={(e) => updateField("status", Number(e.target.value))}
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <Input
            label="Base URL"
            value={form.url || ""}
            onChange={(e) => updateField("url", e.target.value)}
            placeholder="https://your-steadfast-endpoint.com"
          />

          <Input
            label={`API Key ${form.has_api_key ? "(Already saved)" : ""}`}
            type="password"
            value={form.api_key || ""}
            onChange={(e) => updateField("api_key", e.target.value)}
            placeholder={form.has_api_key ? "********" : "Enter API key"}
          />

          <Input
            label={`Secret Key ${form.has_secret_key ? "(Already saved)" : ""}`}
            type="password"
            value={form.secret_key || ""}
            onChange={(e) => updateField("secret_key", e.target.value)}
            placeholder={form.has_secret_key ? "********" : "Enter secret key"}
          />

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SteadfastSettings;
