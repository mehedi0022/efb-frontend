import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiFilter,
  FiEdit2,
  FiEye,
  FiMoreVertical,
  FiPrinter,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSend,
  FiShield,
  FiShoppingCart,
  FiTrash2,
  FiTruck,
} from "react-icons/fi";
import {
  Button as AntButton,
  DatePicker,
  Dropdown,
  Input as AntInput,
  Modal as AntModal,
  Select,
  Table,
} from "antd";
import dayjs from "dayjs";
import Badge from "../../components/common/Badge";
import AppModal from "../../components/common/Modal";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  timeAgo,
  getStatusColor,
} from "../../utils/helpers";
import {
  useAdminActionMutation,
  useAdminFetchQuery,
  useLazyAdminFetchQuery,
} from "../../../store/adminApi";
import {
  showConfirmAlert,
  showErrorAlert,
  showErrorMessage,
  showSuccessAlert,
} from "../../utils/alerts";

const { RangePicker } = DatePicker;
const emptyPathaoDispatchForm = {
  store_id: "",
  recipient_city: "",
  recipient_zone: "",
  recipient_area: "",
};

const ORDER_STATUS_ROUTE_MAP = {
  all: { apiStatus: "all", label: "All Orders" },
  "new-order": { apiStatus: "pending", label: "New Order" },
  complete: { apiStatus: "complete", label: "Complete Orders" },
  "no-response": { apiStatus: "no-response", label: "No Response" },
  hold: { apiStatus: "hold", label: "Hold Orders" },
  cancel: { apiStatus: "cancel", label: "Cancel Orders" },
  "fb-sent": { apiStatus: "fb-sent", label: "Sent FB" },
};

const STATUS_UPDATE_ROUTE_KEYS = new Set([
  "new-order",
  "complete",
  "no-response",
  "hold",
  "cancel",
]);

const normalizeStatusToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const canonicalStatusRouteKey = (value) => {
  const token = normalizeStatusToken(value);
  if (token === "pending" || token === "new-order" || token === "new") {
    return "new-order";
  }

  if (token === "no-response") {
    return "no-response";
  }

  if (token === "complete" || token === "completed") {
    return "complete";
  }

  if (token === "hold") {
    return "hold";
  }

  if (token === "cancel" || token === "cancelled" || token === "canceled") {
    return "cancel";
  }

  return null;
};

const OrderList = () => {
  const { status } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const initialFilters = useMemo(
    () => ({
      keyword: searchParams.get("keyword") || "",
      tracking_code: searchParams.get("tracking_code") || "",
      start_date: searchParams.get("start_date") || "",
      end_date: searchParams.get("end_date") || "",
    }),
    [searchParams],
  );

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [statusModalValue, setStatusModalValue] = useState(undefined);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [sendingEfbOrderIds, setSendingEfbOrderIds] = useState([]);
  const [sendingSteadfastOrderIds, setSendingSteadfastOrderIds] = useState([]);
  const [efbSentOrderIds, setEfbSentOrderIds] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkSubmittingAction, setBulkSubmittingAction] = useState("");
  const [isPathaoModalOpen, setIsPathaoModalOpen] = useState(false);
  const [pathaoDispatchContext, setPathaoDispatchContext] = useState({
    orderIds: [],
    mode: "single",
    label: "",
  });
  const [pathaoDispatchForm, setPathaoDispatchForm] = useState(
    emptyPathaoDispatchForm,
  );
  const [pathaoStoreOptions, setPathaoStoreOptions] = useState([]);
  const [pathaoCityOptions, setPathaoCityOptions] = useState([]);
  const [pathaoZoneOptions, setPathaoZoneOptions] = useState([]);
  const [pathaoAreaOptions, setPathaoAreaOptions] = useState([]);
  const [pathaoMetaLoading, setPathaoMetaLoading] = useState(false);
  const [pathaoZoneLoading, setPathaoZoneLoading] = useState(false);
  const [pathaoAreaLoading, setPathaoAreaLoading] = useState(false);
  const [pathaoDispatching, setPathaoDispatching] = useState(false);
  const [pathaoModalError, setPathaoModalError] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const normalizedStatus = useMemo(() => {
    if (status) {
      return String(status).trim().toLowerCase();
    }

    const pathSegments = String(location.pathname || "")
      .split("/")
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean);

    const lastSegment = pathSegments[pathSegments.length - 1] || "all";
    return lastSegment;
  }, [status, location.pathname]);
  const statusConfig =
    ORDER_STATUS_ROUTE_MAP[normalizedStatus] || ORDER_STATUS_ROUTE_MAP.all;
  const queryStatus = statusConfig.apiStatus;
  const statusLabel = statusConfig.label;
  const canBulkDelete = false;
  const canBulkCompleteActions = queryStatus === "complete";
  const canSelectRows = canBulkCompleteActions;
  const tagKey = `orders:${queryStatus}`;
  const queryArgs = useMemo(
    () => ({
      url: `/admin/orders/${queryStatus}`,
      params: {
        page: pagination.current_page,
        ...appliedFilters,
      },
      tags: [tagKey, "orders"],
    }),
    [queryStatus, pagination.current_page, appliedFilters, tagKey],
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useAdminFetchQuery(queryArgs);
  const { data: statusResponse } = useAdminFetchQuery({
    url: "/admin/order-statuses",
    tags: ["order-statuses"],
  });
  const [adminAction] = useAdminActionMutation();
  const [lazyAdminFetch] = useLazyAdminFetchQuery();
  const allStatusOptions = (statusResponse?.data || []).filter(
    (statusItem) => Number(statusItem.status) === 1,
  );
  const statusUpdateOptions = useMemo(
    () =>
      allStatusOptions.filter((statusItem) => {
        const keyFromSlug = canonicalStatusRouteKey(statusItem?.slug);
        if (keyFromSlug && STATUS_UPDATE_ROUTE_KEYS.has(keyFromSlug)) {
          return true;
        }

        const keyFromName = canonicalStatusRouteKey(statusItem?.name);
        return keyFromName ? STATUS_UPDATE_ROUTE_KEYS.has(keyFromName) : false;
      }),
    [allStatusOptions],
  );

  const pathaoModalBusy =
    pathaoMetaLoading ||
    pathaoZoneLoading ||
    pathaoAreaLoading ||
    pathaoDispatching;

  const resolveImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http://") || image.startsWith("https://"))
      return image;
    const normalized = image.replace(/^\/+/, "");
    if (normalized === "default.png") return null;
    return `/${normalized}`;
  };

  const resolveTrackingUrl = (order) => {
    const trackingCode = String(order?.courier_order_id || "").trim();
    if (!trackingCode) return "";

    const courierName = String(order?.courier_name || "")
      .trim()
      .toLowerCase();
    if (courierName === "pathao") {
      return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(trackingCode)}`;
    }

    if (courierName === "steadfast") {
      return `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}`;
    }

    return `https://www.google.com/search?q=${encodeURIComponent(`tracking ${trackingCode}`)}`;
  };

  const orders = response?.data || [];

  console.log(orders);
  const loading = (isLoading && !response) || isFetching;

  useEffect(() => {
    if (!response?.pagination) return;
    const next = response.pagination;
    setPagination((prev) => {
      if (
        prev.current_page === next.current_page &&
        prev.last_page === next.last_page &&
        prev.total === next.total
      ) {
        return prev;
      }
      return { ...prev, ...next };
    });
  }, [response]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, [normalizedStatus]);

  useEffect(() => {
    setSelectedOrderIds([]);
    setBulkSubmittingAction("");
    setIsStatusModalOpen(false);
    setStatusModalOrder(null);
    setStatusModalValue(undefined);
    setStatusUpdating(false);
    setIsPathaoModalOpen(false);
    setPathaoDispatchContext({ orderIds: [], mode: "single", label: "" });
    setPathaoDispatchForm(emptyPathaoDispatchForm);
    setPathaoStoreOptions([]);
    setPathaoCityOptions([]);
    setPathaoZoneOptions([]);
    setPathaoAreaOptions([]);
    setPathaoModalError("");
    setPathaoMetaLoading(false);
    setPathaoZoneLoading(false);
    setPathaoAreaLoading(false);
    setPathaoDispatching(false);
  }, [normalizedStatus, pagination.current_page, appliedFilters]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const handleSendToFb = async (order) => {
    if (order.shipping_charge !== 120 && order.shipping_charge !== 70) {
      return showErrorAlert({
        title: "দুঃখিত!",
        content:
          "ফ্রিলান্সার বাংলাদেশ এ নিরধারিত ডেলিভারি চার্জ আপনার চার্জ এর সাথে মিল নেই ঢাকার ভিতরে ( ৭০ টাকা) ঢাকার বাহিরে ( ১২০ টাকা)  । অর্ডারটি FB-তে পাঠাতে ডেলিভারি চার্জ সমন্নয় করুন।",
      });
    }

    const orderId = Number(order.id);
    if (!Number.isFinite(orderId) || orderId <= 0) return;
    if (!isCompletedOrder(order)) {
      showErrorMessage("Send FB is available for completed orders only.");
      return;
    }
    if (
      Number(order.is_complete_order) === 1 ||
      efbSentOrderIds.includes(orderId)
    )
      return;

    const confirmed = await showConfirmAlert({
      title: "Are you sure?",
      content: "You want to send this order to FB.",
      okText: "Yes, Send",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setSendingEfbOrderIds((prev) => [...new Set([...prev, orderId])]);

    try {
      const result = await adminAction({
        url: "/admin/orders/send-dropshipping",
        method: "POST",
        body: { order_id: orderId },
        invalidates: [tagKey, "orders"],
        notifySuccess: false,
      }).unwrap();

      setEfbSentOrderIds((prev) => [...new Set([...prev, orderId])]);
      showSuccessAlert({
        title: "ধন্যবাদ",
        content: "আপনার অর্ডারটি সফলভাবে FB-তে পাঠানো হয়েছে।",
      });
    } catch (submitError) {
      showErrorAlert({
        title: "দুঃখিত!",
        content:
          "অর্ডারটি FB-তে পাঠানোর জন্য উপযুক্ত নয়। এটি আপনার বাক্তিগত প্রোডাক্ট ",
      });
    } finally {
      setSendingEfbOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const isCourierDispatchLocked = (order) => {
    const trackingCode = String(order?.courier_order_id || "").trim();
    if (trackingCode) {
      return true;
    }

    const courierName = String(order?.courier_name || "")
      .trim()
      .toLowerCase();
    if (!courierName) {
      return false;
    }

    const courierStatus = String(order?.courier_status || "")
      .trim()
      .toLowerCase();

    return [
      "sent",
      "booked",
      "created",
      "processing",
      "in_transit",
      "in-transit",
      "pending_pickup",
      "picked",
    ].includes(courierStatus);
  };

  const handleSendToSteadfast = async (order) => {
    const orderId = Number(order?.id || 0);
    if (!Number.isFinite(orderId) || orderId <= 0) return;

    if (!isCompletedOrder(order)) {
      showErrorMessage(
        "Send to Steadfast is available for completed orders only.",
      );
      return;
    }

    if (isCourierDispatchLocked(order)) {
      showErrorMessage(
        order?.courier_order_id
          ? `Order already sent to courier. Tracking code: ${order.courier_order_id}.`
          : "Order already sent to courier.",
      );
      return;
    }

    const confirmed = await showConfirmAlert({
      title: "Send to Steadfast?",
      content: "You are about to send this completed order to Steadfast.",
      okText: "Yes, Send",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setSendingSteadfastOrderIds((prev) => [...new Set([...prev, orderId])]);

    try {
      const result = await adminAction({
        url: "/admin/orders/courier/steadfast",
        method: "POST",
        body: { order_id: orderId },
        invalidates: [tagKey, "orders", "courier-orders"],
        notifySuccess: false,
      }).unwrap();

      showSuccessAlert({
        title: "Steadfast Dispatch Complete",
        content: result?.message || "Order sent to Steadfast successfully.",
      });
    } catch (submitError) {
      showErrorMessage(
        submitError?.data?.message || "Failed to send order to Steadfast.",
      );
    } finally {
      setSendingSteadfastOrderIds((prev) =>
        prev.filter((id) => id !== orderId),
      );
    }
  };

  const openStatusUpdateModal = (order) => {
    const orderId = Number(order?.id || 0);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return;
    }

    if (!statusUpdateOptions.length) {
      showErrorMessage("No allowed status found for update.");
      return;
    }

    const currentStatusId = Number(order?.order_status || 0);
    const matchedCurrentOption = statusUpdateOptions.find(
      (option) => Number(option.id) === currentStatusId,
    );
    const fallbackOption = statusUpdateOptions[0];

    setStatusModalOrder(order);
    setStatusModalValue(
      matchedCurrentOption
        ? String(matchedCurrentOption.id)
        : String(fallbackOption.id),
    );
    setIsStatusModalOpen(true);
  };

  const closeStatusUpdateModal = (force = false) => {
    if (statusUpdating && !force) return;
    setIsStatusModalOpen(false);
    setStatusModalOrder(null);
    setStatusModalValue(undefined);
  };

  const submitStatusUpdateFromModal = async () => {
    const orderId = Number(statusModalOrder?.id || 0);
    const nextStatusId = Number(statusModalValue || 0);
    const currentStatusId = Number(statusModalOrder?.order_status || 0);

    if (!Number.isFinite(orderId) || orderId <= 0) {
      showErrorMessage("Invalid order selected.");
      return;
    }

    if (!Number.isFinite(nextStatusId) || nextStatusId <= 0) {
      showErrorMessage("Please select a valid status.");
      return;
    }

    if (nextStatusId === currentStatusId) {
      showErrorMessage("Selected status is already applied.");
      return;
    }

    const selectedStatus = statusUpdateOptions.find(
      (statusItem) => Number(statusItem.id) === nextStatusId,
    );

    setStatusUpdating(true);
    try {
      const result = await adminAction({
        url: "/admin/orders/update-status",
        method: "POST",
        body: {
          order_ids: [orderId],
          status: nextStatusId,
        },
        invalidates: [tagKey, "orders"],
        notifySuccess: false,
      }).unwrap();

      showSuccessAlert({
        title: "Status Updated",
        content:
          result?.message ||
          `Order #${statusModalOrder?.invoice_id || orderId} status updated to "${selectedStatus?.name || "Selected"}".`,
      });

      closeStatusUpdateModal(true);
    } catch (submitError) {
      showErrorMessage(
        submitError?.data?.message || "Failed to update order status.",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleFilterSubmit = () => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    setAppliedFilters(filters);
    const params = new URLSearchParams();
    if (filters.keyword) params.set("keyword", filters.keyword);
    if (filters.tracking_code)
      params.set("tracking_code", filters.tracking_code);
    if (filters.start_date) params.set("start_date", filters.start_date);
    if (filters.end_date) params.set("end_date", filters.end_date);
    navigate({ search: params.toString() }, { replace: true });
  };

  const handleFilterReset = () => {
    const reset = { name: "", tracking_code: "", start_date: "", end_date: "" };
    setFilters(reset);
    setAppliedFilters(reset);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    navigate({ search: "" }, { replace: true });
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, current_page: page }));
  };

  const resetBulkSelection = () => {
    setSelectedOrderIds([]);
  };

  const closePathaoDispatchModal = (force = false) => {
    if (pathaoDispatching && !force) return;

    setIsPathaoModalOpen(false);
    setPathaoDispatchContext({ orderIds: [], mode: "single", label: "" });
    setPathaoDispatchForm(emptyPathaoDispatchForm);
    setPathaoStoreOptions([]);
    setPathaoCityOptions([]);
    setPathaoZoneOptions([]);
    setPathaoAreaOptions([]);
    setPathaoModalError("");
    setPathaoMetaLoading(false);
    setPathaoZoneLoading(false);
    setPathaoAreaLoading(false);
  };

  const loadPathaoAreas = async (zoneId, { presetAreaId } = {}) => {
    const normalizedZoneId = Number(zoneId);
    if (!Number.isFinite(normalizedZoneId) || normalizedZoneId <= 0) {
      setPathaoAreaOptions([]);
      setPathaoDispatchForm((prev) => ({ ...prev, recipient_area: "" }));
      return;
    }

    setPathaoAreaLoading(true);
    setPathaoModalError("");
    try {
      const result = await lazyAdminFetch({
        url: "/admin/orders/courier/pathao/areas",
        params: { zone_id: normalizedZoneId },
      }).unwrap();

      const areas = Array.isArray(result?.data?.areas) ? result.data.areas : [];
      setPathaoAreaOptions(areas);

      const desiredAreaId =
        presetAreaId !== undefined && presetAreaId !== null
          ? String(presetAreaId)
          : "";
      const areaExists =
        desiredAreaId !== "" &&
        areas.some((areaOption) => String(areaOption?.id) === desiredAreaId);

      setPathaoDispatchForm((prev) => ({
        ...prev,
        recipient_area: areaExists ? desiredAreaId : "",
      }));
    } catch (fetchError) {
      setPathaoAreaOptions([]);
      setPathaoDispatchForm((prev) => ({ ...prev, recipient_area: "" }));
      setPathaoModalError(
        fetchError?.data?.message || "Unable to load Pathao areas.",
      );
    } finally {
      setPathaoAreaLoading(false);
    }
  };

  const loadPathaoZones = async (
    cityId,
    { presetZoneId, presetAreaId } = {},
  ) => {
    const normalizedCityId = Number(cityId);
    if (!Number.isFinite(normalizedCityId) || normalizedCityId <= 0) {
      setPathaoZoneOptions([]);
      setPathaoAreaOptions([]);
      setPathaoDispatchForm((prev) => ({
        ...prev,
        recipient_zone: "",
        recipient_area: "",
      }));
      return;
    }

    setPathaoZoneLoading(true);
    setPathaoModalError("");
    try {
      const result = await lazyAdminFetch({
        url: "/admin/orders/courier/pathao/zones",
        params: { city_id: normalizedCityId },
      }).unwrap();

      const zones = Array.isArray(result?.data?.zones) ? result.data.zones : [];
      setPathaoZoneOptions(zones);
      setPathaoAreaOptions([]);

      const desiredZoneId =
        presetZoneId !== undefined && presetZoneId !== null
          ? String(presetZoneId)
          : "";
      const zoneExists =
        desiredZoneId !== "" &&
        zones.some((zoneOption) => String(zoneOption?.id) === desiredZoneId);

      const nextZoneId = zoneExists ? desiredZoneId : "";
      setPathaoDispatchForm((prev) => ({
        ...prev,
        recipient_zone: nextZoneId,
        recipient_area: "",
      }));

      if (nextZoneId !== "") {
        await loadPathaoAreas(nextZoneId, { presetAreaId });
      }
    } catch (fetchError) {
      setPathaoZoneOptions([]);
      setPathaoAreaOptions([]);
      setPathaoDispatchForm((prev) => ({
        ...prev,
        recipient_zone: "",
        recipient_area: "",
      }));
      setPathaoModalError(
        fetchError?.data?.message || "Unable to load Pathao zones.",
      );
    } finally {
      setPathaoZoneLoading(false);
    }
  };

  const openPathaoDispatchModal = async ({ orderIds, mode, label }) => {
    const normalizedOrderIds = (orderIds || [])
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);

    if (!normalizedOrderIds.length) {
      showErrorMessage(
        "No valid completed order selected for Pathao dispatch.",
      );
      return;
    }

    setPathaoDispatchContext({
      orderIds: normalizedOrderIds,
      mode: mode || "single",
      label: label || "",
    });
    setPathaoDispatchForm(emptyPathaoDispatchForm);
    setPathaoStoreOptions([]);
    setPathaoCityOptions([]);
    setPathaoZoneOptions([]);
    setPathaoAreaOptions([]);
    setPathaoModalError("");
    setIsPathaoModalOpen(true);
    setPathaoMetaLoading(true);

    try {
      const result = await lazyAdminFetch({
        url: "/admin/orders/courier/pathao/meta",
      }).unwrap();

      const stores = Array.isArray(result?.data?.stores)
        ? result.data.stores
        : [];
      const cities = Array.isArray(result?.data?.cities)
        ? result.data.cities
        : [];
      const defaults = result?.data?.defaults || {};

      const defaultStoreId =
        defaults?.store_id !== undefined && defaults?.store_id !== null
          ? String(defaults.store_id)
          : stores[0]?.id !== undefined && stores[0]?.id !== null
            ? String(stores[0].id)
            : "";
      const defaultCityId =
        defaults?.recipient_city !== undefined &&
        defaults?.recipient_city !== null
          ? String(defaults.recipient_city)
          : "";

      setPathaoStoreOptions(stores);
      setPathaoCityOptions(cities);
      setPathaoDispatchForm((prev) => ({
        ...prev,
        store_id: defaultStoreId,
        recipient_city: defaultCityId,
        recipient_zone: "",
        recipient_area: "",
      }));

      const hasDefaultCity =
        defaultCityId !== "" &&
        cities.some((cityOption) => String(cityOption?.id) === defaultCityId);

      if (hasDefaultCity) {
        await loadPathaoZones(defaultCityId, {
          presetZoneId: defaults?.recipient_zone,
          presetAreaId: defaults?.recipient_area,
        });
      }
    } catch (fetchError) {
      setPathaoModalError(
        fetchError?.data?.message || "Unable to load Pathao city list.",
      );
    } finally {
      setPathaoMetaLoading(false);
    }
  };

  const handlePathaoCityChange = async (event) => {
    const cityId = String(event.target.value || "");
    setPathaoDispatchForm((prev) => ({
      ...prev,
      recipient_city: cityId,
      recipient_zone: "",
      recipient_area: "",
    }));
    setPathaoZoneOptions([]);
    setPathaoAreaOptions([]);

    if (cityId !== "") {
      await loadPathaoZones(cityId);
    }
  };

  const handlePathaoZoneChange = async (event) => {
    const zoneId = String(event.target.value || "");
    setPathaoDispatchForm((prev) => ({
      ...prev,
      recipient_zone: zoneId,
      recipient_area: "",
    }));
    setPathaoAreaOptions([]);

    if (zoneId !== "") {
      await loadPathaoAreas(zoneId);
    }
  };

  const submitPathaoDispatchFromModal = async () => {
    if (!pathaoDispatchContext.orderIds.length) {
      showErrorMessage("No order selected for Pathao dispatch.");
      return;
    }

    const recipientCity = Number(pathaoDispatchForm.recipient_city);
    const recipientZone = Number(pathaoDispatchForm.recipient_zone);

    if (!Number.isFinite(recipientCity) || recipientCity <= 0) {
      showErrorMessage("Please select a valid Pathao city.");
      return;
    }

    if (!Number.isFinite(recipientZone) || recipientZone <= 0) {
      showErrorMessage("Please select a valid Pathao zone.");
      return;
    }

    const payload = {
      order_ids: pathaoDispatchContext.orderIds,
      recipient_city: recipientCity,
      recipient_zone: recipientZone,
    };

    if (String(pathaoDispatchForm.store_id || "").trim() !== "") {
      payload.store_id = String(pathaoDispatchForm.store_id).trim();
    }

    const recipientArea = Number(pathaoDispatchForm.recipient_area);
    if (Number.isFinite(recipientArea) && recipientArea > 0) {
      payload.recipient_area = recipientArea;
    }

    setPathaoDispatching(true);
    setPathaoModalError("");
    try {
      const result = await adminAction({
        url: "/admin/orders/courier/pathao",
        method: "POST",
        body: payload,
        invalidates: [tagKey, "orders"],
        notifySuccess: false,
      }).unwrap();

      showSuccessAlert({
        title: "Pathao Dispatch Complete",
        content:
          result?.message || "Selected order(s) sent to Pathao successfully.",
      });

      if (pathaoDispatchContext.mode === "bulk") {
        resetBulkSelection();
      }

      closePathaoDispatchModal(true);
    } catch (submitError) {
      const errorMessage =
        submitError?.data?.message || "Failed to send order(s) to Pathao.";
      setPathaoModalError(errorMessage);
      showErrorMessage(errorMessage);
    } finally {
      setPathaoDispatching(false);
    }
  };

  const isCompletedOrder = (order) => {
    const statusValues = [
      order?.status?.slug,
      order?.status?.name,
      order?.status_name,
      order?.order_status,
    ];

    return statusValues.some((value) => {
      const normalizedValue = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, "-");

      return (
        normalizedValue === "complete" ||
        normalizedValue === "completed" ||
        normalizedValue === "6"
      );
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedOrderIds.length) {
      showErrorMessage("Select at least one order.");
      return;
    }

    const confirmed = await showConfirmAlert({
      title: "Delete Selected Orders?",
      content: `You are about to delete ${selectedOrderIds.length} order(s).`,
      okText: "Yes, Delete",
      cancelText: "Cancel",
      okType: "danger",
    });

    if (!confirmed) return;

    setBulkSubmittingAction("delete");
    setBulkSubmitting(true);
    try {
      const result = await adminAction({
        url: "/admin/orders/delete",
        method: "DELETE",
        body: { order_ids: selectedOrderIds },
        invalidates: [tagKey, "orders"],
        notifySuccess: false,
      }).unwrap();

      showSuccessAlert({
        title: "Deleted",
        content: result?.message || "Selected orders deleted successfully.",
      });
      resetBulkSelection();
    } catch (submitError) {
      showErrorMessage(submitError?.data?.message || "Delete action failed.");
    } finally {
      setBulkSubmitting(false);
      setBulkSubmittingAction("");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const confirmed = await showConfirmAlert({
      title: "Delete Order?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      cancelText: "Cancel",
      okType: "danger",
    });

    if (!confirmed) return;

    try {
      const result = await adminAction({
        url: `/admin/orders/delete`,
        method: "DELETE",
        body: { order_ids: [orderId] },
        invalidates: [tagKey, "orders"],
        notifySuccess: false,
      }).unwrap();

      showSuccessAlert({
        title: "Deleted",
        content: result?.message || "Order deleted successfully.",
      });
    } catch (error) {
      showErrorMessage(error?.data?.message || "Delete failed.");
    }
  };

  const handleBulkCourierDispatch = async (courier) => {
    if (!selectedOrderIds.length) {
      showErrorMessage("Select at least one order.");
      return;
    }

    const isPathao = courier === "pathao";
    if (isPathao) {
      await openPathaoDispatchModal({
        orderIds: selectedOrderIds,
        mode: "bulk",
        label: `${selectedOrderIds.length} completed order(s)`,
      });
      return;
    }

    const actionLabel = isPathao ? "Pathao" : "Steadfast";
    const confirmed = await showConfirmAlert({
      title: `Send Selected to ${actionLabel}?`,
      content: `You are about to send ${selectedOrderIds.length} completed order(s) to ${actionLabel}.`,
      okText: "Yes, Send",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setBulkSubmittingAction("send_steadfast");
    setBulkSubmitting(true);
    try {
      const result = await adminAction({
        url: "/admin/orders/courier/steadfast",
        method: "POST",
        body: { order_ids: selectedOrderIds },
        invalidates: [tagKey, "orders"],
        notifySuccess: false,
      }).unwrap();

      showSuccessAlert({
        title: "Steadfast Dispatch Complete",
        content:
          result?.message ||
          `Selected completed orders sent to ${actionLabel}.`,
      });
      resetBulkSelection();
    } catch (submitError) {
      showErrorMessage(
        submitError?.data?.message ||
          `Failed to send orders to ${actionLabel}.`,
      );
    } finally {
      setBulkSubmitting(false);
      setBulkSubmittingAction("");
    }
  };

  const handleBulkSendToFb = async () => {
    if (!selectedOrderIds.length) {
      showErrorMessage("Select at least one order.");
      return;
    }

    const confirmed = await showConfirmAlert({
      title: "Send Selected to FB?",
      content: `You are about to send ${selectedOrderIds.length} completed order(s) to FB.`,
      okText: "Yes, Send",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setBulkSubmittingAction("send_fb");
    setBulkSubmitting(true);
    try {
      const result = await adminAction({
        url: "/admin/orders/send-dropshipping",
        method: "POST",
        body: { order_ids: selectedOrderIds },
        invalidates: [tagKey, "orders"],
        notifySuccess: false,
      }).unwrap();

      setEfbSentOrderIds((prev) => [
        ...new Set([...prev, ...selectedOrderIds]),
      ]);
      showSuccessAlert({
        title: "FB Send Complete",
        content:
          result?.message ||
          "Selected completed orders sent to FB successfully.",
      });
      resetBulkSelection();
    } catch (submitError) {
      showErrorMessage(
        submitError?.data?.message || "Failed to send orders to FB.",
      );
    } finally {
      setBulkSubmitting(false);
      setBulkSubmittingAction("");
    }
  };

  const handleBulkPrintInvoices = async () => {
    if (!selectedOrderIds.length) {
      showErrorMessage("Select at least one order.");
      return;
    }

    setBulkSubmittingAction("print_invoice");
    setBulkSubmitting(true);
    try {
      const result = await adminAction({
        url: "/admin/orders/print",
        method: "POST",
        body: { order_ids: selectedOrderIds },
        notifySuccess: false,
      }).unwrap();

      const printView = result?.view || "";
      if (!printView) {
        showErrorMessage("No printable content was returned.");
        return;
      }

      const printWindow = window.open("", "_blank", "width=1200,height=800");
      if (!printWindow) {
        showErrorMessage(
          "Unable to open print window. Please allow popups and try again.",
        );
        return;
      }

      printWindow.document.open();
      printWindow.document.write(printView);
      printWindow.document.close();
      printWindow.focus();

      showSuccessAlert({
        title: "Invoice Ready",
        content: `Print view opened for ${selectedOrderIds.length} order(s).`,
      });
    } catch (submitError) {
      showErrorMessage(
        submitError?.data?.message || "Failed to print selected invoices.",
      );
    } finally {
      setBulkSubmitting(false);
      setBulkSubmittingAction("");
    }
  };

  const filterRangeValue = useMemo(() => {
    const start = filters.start_date
      ? dayjs(filters.start_date, "YYYY-MM-DD")
      : null;
    const end = filters.end_date ? dayjs(filters.end_date, "YYYY-MM-DD") : null;

    if (!start && !end) return null;
    return [start, end];
  }, [filters.start_date, filters.end_date]);

  const filterRangePresets = useMemo(
    () => [
      {
        label: "Last 7 Days",
        value: [
          dayjs().subtract(6, "day").startOf("day"),
          dayjs().endOf("day"),
        ],
      },
      {
        label: "Last 30 Days",
        value: [
          dayjs().subtract(29, "day").startOf("day"),
          dayjs().endOf("day"),
        ],
      },
      {
        label: "Last 90 Days",
        value: [
          dayjs().subtract(89, "day").startOf("day"),
          dayjs().endOf("day"),
        ],
      },
    ],
    [],
  );

  const perPage = Number(response?.pagination?.per_page || 20);

  const columns = [
    {
      header: "SL",
      accessor: "id",
      width: "4%",
      render: (row, index) =>
        (Math.max(1, Number(pagination.current_page || 1)) - 1) * perPage +
        index +
        1,
    },
    {
      header: "Image",
      accessor: "image",
      width: "8%",
      render: (row) => (
        <img
          src={resolveImageUrl(row.image) || "https://via.placeholder.com/50"}
          alt="Order"
          className="h-12 w-12 rounded-lg object-cover ring-1 ring-admin-gray-200"
        />
      ),
    },
    {
      header: "Invoice",
      accessor: "invoice_id",
      width: "9%",
    },
    {
      header: "Tracking",
      accessor: "courier_order_id",
      width: "11%",
      render: (row) => {
        const trackingCode = String(row?.courier_order_id || "").trim();
        if (!trackingCode) {
          return <span className="text-xs text-gray-400">-</span>;
        }

        const trackingUrl = resolveTrackingUrl(row);
        return (
          <div className="space-y-1">
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
                title="Track order in courier portal"
              >
                <AntButton
                  size="small"
                  type="primary"
                  icon={<FiTruck size={13} />}
                >
                  Track
                </AntButton>
              </a>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Fraud Check",
      accessor: "fraud_check",
      width: "11%",
      render: (row) => (
        <Link
          to={`/fraud-checker${
            row?.shipping?.phone || row?.customer?.phone
              ? `?phone=${encodeURIComponent(row?.shipping?.phone || row?.customer?.phone || "")}`
              : ""
          }`}
        >
          <AntButton
            size="small"
            icon={<FiShield size={13} />}
            className="!border-amber-400 !text-amber-600 hover:!border-amber-500 hover:!text-amber-700"
          >
            Fraud Check
          </AntButton>
        </Link>
      ),
    },
    {
      header: "Date",
      accessor: "updated_at",
      width: "15%",
      render: (row) => (
        <div className="text-xs">
          <div>{formatDate(row.updated_at)}</div>
          <div>{formatDateTime(row.updated_at).split(" ")[1]}</div>
          <div className="text-gray-500">{timeAgo(row.updated_at)}</div>
        </div>
      ),
    },
    {
      header: "Customer",
      accessor: "customer",
      width: "18%",
      render: (row) => (
        <div className="text-xs">
          {row.shipping?.name}, {row.shipping?.address}, {row.shipping?.phone}
        </div>
      ),
    },
    {
      header: "IP Address",
      accessor: "ip_address",
      width: "12%",
      render: (row) => (
        <span className="font-mono text-xs">
          {row.ip_address || row.shipping?.ip_address || "-"}
        </span>
      ),
    },
    {
      header: "Amount",
      accessor: "amount",
      width: "8%",
      render: (row) => formatCurrency(row.amount),
    },
    {
      header: "Status",
      accessor: "status",
      width: "14%",
      render: (row) => (
        <Badge color={getStatusColor(row.status?.name)}>
          {row.status?.name || row.status_name || "Unknown"}
        </Badge>
      ),
    },
    {
      header: "Action",
      accessor: "actions",
      width: isMobileViewport ? 68 : 420,
      fixed: "right",
      className: "orders-action-cell",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
      onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
      render: (row) => {
        const orderId = Number(row.id);
        const isNewOrder =
          String(row?.status?.name || "").toLowerCase() === "new order";
        const isSendingEfb = sendingEfbOrderIds.includes(orderId);
        const isSendingSteadfast = sendingSteadfastOrderIds.includes(orderId);
        const isEfbSent =
          Number(row.is_complete_order) === 1 ||
          efbSentOrderIds.includes(orderId);
        const isCompleted = queryStatus === "complete" && isCompletedOrder(row);
        const isFbSentList =
          queryStatus === "fb-sent" ||
          String(row?.status?.slug || row?.status?.name || "")
            .toLowerCase()
            .replace(/[_\s]+/g, "-") === "fb-sent";

        const mobileMenuItems = [
          {
            key: `invoice-${orderId}`,
            label: "Invoice",
            icon: <FiEye size={14} />,
            onClick: () => navigate(`/orders/invoice/${row.invoice_id}`),
          },
        ];

        if (!isFbSentList) {
          mobileMenuItems.push(
            {
              key: `edit-${orderId}`,
              label: "Edit",
              icon: <FiEdit2 size={14} />,
              onClick: () => navigate(`/orders/edit/${row.invoice_id}`),
            },
            {
              key: `update-${orderId}`,
              label: "Update",
              icon: <FiRefreshCw size={14} />,
              disabled: statusUpdateOptions.length === 0,
              onClick: () => openStatusUpdateModal(row),
            },
          );

          if (isNewOrder) {
            mobileMenuItems.push({
              key: `delete-${orderId}`,
              label: "Delete",
              icon: <FiTrash2 size={14} />,
              onClick: () => handleDeleteOrder(orderId),
            });
          }

          if (isCompleted) {
            mobileMenuItems.push({
              key: `send-fb-${orderId}`,
              label: isEfbSent
                ? "Sent"
                : isSendingEfb
                  ? "Sending..."
                  : "Send FB",
              icon: <FiSend size={14} />,
              disabled: isEfbSent || isSendingEfb,
              onClick: () => handleSendToFb(row),
            });

            mobileMenuItems.push({
              key: `send-steadfast-${orderId}`,
              label: isSteadfastSent
                ? "Steadfast Sent"
                : isSendingSteadfast
                  ? "Sending..."
                  : "Send Steadfast",
              icon: <FiTruck size={14} />,
              disabled: isSteadfastSent || isSendingSteadfast,
              onClick: () => handleSendToSteadfast(row),
            });
          }
        }

        if (isFbSentList) {
          return (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="hidden md:flex flex-nowrap items-center gap-2">
                <Link to={`/orders/invoice/${row.invoice_id}`}>
                  <AntButton
                    size="small"
                    type="primary"
                    icon={<FiEye size={13} />}
                  >
                    Invoice
                  </AntButton>
                </Link>
              </div>
              <div className="md:hidden">
                <Dropdown
                  trigger={["click"]}
                  placement="bottomRight"
                  menu={{ items: mobileMenuItems }}
                >
                  <AntButton
                    size="small"
                    icon={<FiMoreVertical size={14} />}
                    className="!h-7 !w-7 !min-w-[28px] !px-0 !flex !items-center !justify-center"
                    aria-label="Order actions"
                  />
                </Dropdown>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="hidden md:flex flex-nowrap items-center gap-2">
              <Link to={`/orders/invoice/${row.invoice_id}`}>
                <AntButton
                  size="small"
                  type="primary"
                  icon={<FiEye size={13} />}
                >
                  Invoice
                </AntButton>
              </Link>
              {!isFbSentList && (
                <Link to={`/orders/edit/${row.invoice_id}`}>
                  <AntButton
                    size="small"
                    icon={<FiEdit2 size={13} />}
                    className="!border-amber-400 !text-amber-600 hover:!border-amber-500 hover:!text-amber-700"
                  >
                    Edit
                  </AntButton>
                </Link>
              )}
              {!isFbSentList && (
                <AntButton
                  size="small"
                  icon={<FiRefreshCw size={13} />}
                  onClick={() => openStatusUpdateModal(row)}
                  disabled={statusUpdateOptions.length === 0}
                >
                  Update
                </AntButton>
              )}

              {isNewOrder && (
                <AntButton
                  size="small"
                  danger
                  icon={<FiTrash2 size={13} />}
                  onClick={() => handleDeleteOrder(row.id)}
                >
                  Delete
                </AntButton>
              )}

              {isCompleted ? (
                <>
                  <AntButton
                    size="small"
                    type={isEfbSent ? "default" : "primary"}
                    icon={<FiSend size={13} />}
                    disabled={isSendingEfb}
                    className={
                      isEfbSent
                        ? "!border-emerald-500 !text-emerald-600"
                        : "!bg-admin-accent hover:!bg-admin-accent/90"
                    }
                    onClick={() => handleSendToFb(row)}
                  >
                    {isEfbSent
                      ? "Sent"
                      : isSendingEfb
                        ? "Sending..."
                        : "Send FB"}
                  </AntButton>
                  <AntButton
                    size="small"
                    type={isSteadfastSent ? "default" : "primary"}
                    icon={<FiTruck size={13} />}
                    disabled={isSteadfastSent || isSendingSteadfast}
                    className={
                      isSteadfastSent
                        ? "!border-sky-500 !text-sky-600"
                        : "!bg-sky-600 hover:!bg-sky-700"
                    }
                    onClick={() => handleSendToSteadfast(row)}
                  >
                    {isSteadfastSent
                      ? "Steadfast Sent"
                      : isSendingSteadfast
                        ? "Sending..."
                        : "Send Steadfast"}
                  </AntButton>
                </>
              ) : null}
            </div>

            <div className="md:hidden">
              <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{ items: mobileMenuItems }}
              >
                <AntButton
                  size="small"
                  icon={<FiMoreVertical size={14} />}
                  className="!h-7 !w-7 !min-w-[28px] !px-0 !flex !items-center !justify-center"
                  aria-label="Order actions"
                />
              </Dropdown>
            </div>
          </div>
        );
      },
    },
  ];

  const antdColumns = useMemo(
    () =>
      columns.map((column) => ({
        title: column.header,
        dataIndex: column.accessor,
        key: column.accessor,
        width: column.width,
        fixed: column.fixed,
        className: column.className,
        onCell: column.onCell,
        onHeaderCell: column.onHeaderCell,
        render: (_, row, index) =>
          column.render ? column.render(row, index) : row?.[column.accessor],
      })),
    [columns],
  );

  const rowSelection = canSelectRows
    ? {
        selectedRowKeys: selectedOrderIds,
        onChange: (keys) => {
          const normalized = keys
            .map((key) => Number(key))
            .filter((key) => Number.isFinite(key) && key > 0);
          setSelectedOrderIds(normalized);
        },
        preserveSelectedRowKeys: true,
      }
    : undefined;

  return (
    <div className="container-fluid">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-admin-primary/10 text-admin-primary">
              <FiShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-admin-gray-500">
                Orders
              </p>
              <h4 className="text-2xl font-semibold text-admin-dark">
                {statusLabel}{" "}
                <span className="text-admin-gray-500">
                  ({pagination.total || 0})
                </span>
              </h4>
            </div>
          </div>
          <Link to="/orders/create">
            <AntButton type="primary" icon={<FiPlus size={14} />}>
              Create Order
            </AntButton>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="px-4 py-5 md:px-5">
          <div className="mb-6 rounded-xl border border-slate-200/70 bg-admin-gray-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-admin-gray-500">
                  Filters
                </p>
                <p className="text-sm text-admin-gray-600">
                  Filter by customer name or date range
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AntButton
                  type="primary"
                  icon={<FiFilter size={13} />}
                  onClick={handleFilterSubmit}
                >
                  Apply
                </AntButton>
                <AntButton
                  icon={<FiRotateCcw size={13} />}
                  onClick={handleFilterReset}
                >
                  Reset
                </AntButton>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Filter by Customer Name, phone, Order Invoice ID
                </label>
                <AntInput
                  size="large"
                  placeholder="Type customer name, phone, or invoice ID"
                  value={filters.keyword}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, keyword: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date Range
                </label>
                <RangePicker
                  value={filterRangeValue}
                  format="YYYY-MM-DD"
                  allowClear
                  size="large"
                  presets={filterRangePresets}
                  style={{ width: "100%" }}
                  onChange={(_, dateStrings) => {
                    setFilters((prev) => ({
                      ...prev,
                      start_date: dateStrings?.[0] || "",
                      end_date: dateStrings?.[1] || "",
                    }));
                  }}
                />
              </div>
            </div>

            {canBulkDelete ? (
              <div className="mt-4 rounded-lg border border-slate-200/70 bg-white p-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <p className="text-sm text-admin-gray-600">
                    All orders support bulk delete.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <AntButton
                      danger
                      disabled={bulkSubmitting || selectedOrderIds.length === 0}
                      onClick={handleBulkDelete}
                      icon={<FiTrash2 size={13} />}
                    >
                      {bulkSubmitting && bulkSubmittingAction === "delete"
                        ? "Deleting..."
                        : `Delete Selected (${selectedOrderIds.length})`}
                    </AntButton>
                    {selectedOrderIds.length > 0 ? (
                      <AntButton onClick={resetBulkSelection}>
                        Clear Selection ({selectedOrderIds.length})
                      </AntButton>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {canBulkCompleteActions ? (
              <div className="mt-4 rounded-lg border border-slate-200/70 bg-white p-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <p className="text-sm text-admin-gray-600">
                    Complete orders support bulk courier dispatch, FB send, and
                    invoice print.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <AntButton
                      disabled={bulkSubmitting || selectedOrderIds.length === 0}
                      onClick={() => handleBulkCourierDispatch("steadfast")}
                      icon={<FiTruck size={13} />}
                      className="!border-amber-400 !text-amber-600 hover:!border-amber-500 hover:!text-amber-700"
                    >
                      {bulkSubmitting &&
                      bulkSubmittingAction === "send_steadfast"
                        ? "Sending..."
                        : `Send Steadfast (${selectedOrderIds.length})`}
                    </AntButton>
                    <AntButton
                      type="primary"
                      disabled={
                        bulkSubmitting ||
                        selectedOrderIds.length === 0 ||
                        pathaoModalBusy
                      }
                      onClick={() => handleBulkCourierDispatch("pathao")}
                      icon={<FiSend size={13} />}
                    >
                      {isPathaoModalOpen &&
                      pathaoDispatchContext.mode === "bulk" &&
                      pathaoModalBusy
                        ? "Preparing..."
                        : `Send Pathao (${selectedOrderIds.length})`}
                    </AntButton>
                    {/* <AntButton
                      disabled={bulkSubmitting || selectedOrderIds.length === 0}
                      onClick={handleBulkSendToFb}
                      icon={<FiSend size={13} />}
                      className="!border-cyan-400 !text-cyan-700 hover:!border-cyan-500 hover:!text-cyan-800"
                    >
                      {bulkSubmitting && bulkSubmittingAction === "send_fb"
                        ? "Sending..."
                        : `Bulk Send FB (${selectedOrderIds.length})`}
                    </AntButton> */}
                    <AntButton
                      disabled={bulkSubmitting || selectedOrderIds.length === 0}
                      onClick={handleBulkPrintInvoices}
                      icon={<FiPrinter size={13} />}
                    >
                      {bulkSubmitting &&
                      bulkSubmittingAction === "print_invoice"
                        ? "Preparing..."
                        : `Print Invoice (${selectedOrderIds.length})`}
                    </AntButton>
                    {selectedOrderIds.length > 0 ? (
                      <AntButton onClick={resetBulkSelection}>
                        Clear Selection ({selectedOrderIds.length})
                      </AntButton>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load orders.{" "}
              {error?.data?.message || "Please try again."}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
            <Table
              className="admin-orders-table"
              rowKey={(record) => Number(record.id)}
              columns={antdColumns}
              dataSource={orders}
              loading={loading}
              rowSelection={rowSelection}
              pagination={{
                current: Number(pagination.current_page || 1),
                pageSize: perPage,
                total: Number(pagination.total || 0),
                showSizeChanger: false,
                onChange: (page) => handlePageChange(page),
              }}
              scroll={{ x: 1900 }}
            />
          </div>
        </div>
      </div>

      <AntModal
        title="Update Order Status"
        open={isStatusModalOpen}
        onCancel={() => closeStatusUpdateModal()}
        onOk={submitStatusUpdateFromModal}
        okText={statusUpdating ? "Updating..." : "Confirm Update"}
        cancelText="Cancel"
        okButtonProps={{
          loading: statusUpdating,
          disabled: statusUpdating || !statusModalValue,
        }}
        cancelButtonProps={{ disabled: statusUpdating }}
        destroyOnClose
      >
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Invoice:{" "}
            <span className="font-semibold">
              #{statusModalOrder?.invoice_id || "-"}
            </span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Select Status
            </label>
            <Select
              className="w-full"
              value={statusModalValue}
              onChange={(value) => setStatusModalValue(String(value))}
              placeholder="Select status"
              options={statusUpdateOptions.map((statusItem) => ({
                value: String(statusItem.id),
                label: statusItem.name,
              }))}
              disabled={statusUpdating}
            />
          </div>
        </div>
      </AntModal>

      <AppModal
        isOpen={isPathaoModalOpen}
        onClose={closePathaoDispatchModal}
        title="Send To Pathao"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-admin-gray-200 bg-admin-gray-50 px-3 py-2 text-sm text-admin-gray-700">
            Dispatching completed order(s):{" "}
            <span className="font-semibold">
              {pathaoDispatchContext.label ||
                `${pathaoDispatchContext.orderIds.length} order(s)`}
            </span>
          </div>

          {pathaoModalError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {pathaoModalError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Store (Optional)
              </label>
              <Select
                className="w-full"
                value={pathaoDispatchForm.store_id || undefined}
                onChange={(value) =>
                  setPathaoDispatchForm((prev) => ({
                    ...prev,
                    store_id: String(value || ""),
                  }))
                }
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Auto select store"
                options={pathaoStoreOptions.map((storeOption) => ({
                  value: String(storeOption.id),
                  label: `${storeOption.name} (${storeOption.id})`,
                }))}
                disabled={pathaoMetaLoading || pathaoDispatching}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Recipient City *
              </label>
              <Select
                className="w-full"
                value={pathaoDispatchForm.recipient_city || undefined}
                onChange={async (value) => {
                  await handlePathaoCityChange({ target: { value } });
                }}
                showSearch
                optionFilterProp="label"
                placeholder={
                  pathaoMetaLoading ? "Loading cities..." : "Select city"
                }
                options={pathaoCityOptions.map((cityOption) => ({
                  value: String(cityOption.id),
                  label: `${cityOption.name} (${cityOption.id})`,
                }))}
                disabled={pathaoMetaLoading || pathaoDispatching}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Recipient Zone *
              </label>
              <Select
                className="w-full"
                value={pathaoDispatchForm.recipient_zone || undefined}
                onChange={async (value) => {
                  await handlePathaoZoneChange({ target: { value } });
                }}
                showSearch
                optionFilterProp="label"
                placeholder={
                  pathaoZoneLoading ? "Loading zones..." : "Select zone"
                }
                options={pathaoZoneOptions.map((zoneOption) => ({
                  value: String(zoneOption.id),
                  label: `${zoneOption.name} (${zoneOption.id})`,
                }))}
                disabled={
                  pathaoMetaLoading ||
                  pathaoZoneLoading ||
                  pathaoDispatching ||
                  !pathaoDispatchForm.recipient_city
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Recipient Area
              </label>
              <Select
                className="w-full"
                value={pathaoDispatchForm.recipient_area || undefined}
                onChange={(value) =>
                  setPathaoDispatchForm((prev) => ({
                    ...prev,
                    recipient_area: String(value || ""),
                  }))
                }
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={
                  pathaoAreaLoading
                    ? "Loading areas..."
                    : "Select area (optional)"
                }
                options={pathaoAreaOptions.map((areaOption) => ({
                  value: String(areaOption.id),
                  label: `${areaOption.name} (${areaOption.id})`,
                }))}
                disabled={
                  pathaoMetaLoading ||
                  pathaoAreaLoading ||
                  pathaoDispatching ||
                  !pathaoDispatchForm.recipient_zone
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <AntButton
              onClick={closePathaoDispatchModal}
              disabled={pathaoDispatching}
            >
              Cancel
            </AntButton>
            <AntButton
              type="primary"
              onClick={submitPathaoDispatchFromModal}
              disabled={
                pathaoDispatching ||
                pathaoMetaLoading ||
                pathaoZoneLoading ||
                pathaoAreaLoading ||
                !pathaoDispatchForm.recipient_city ||
                !pathaoDispatchForm.recipient_zone
              }
            >
              {pathaoDispatching ? "Sending..." : "Send To Pathao"}
            </AntButton>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default OrderList;
