import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminFetchQuery } from "../../../store/adminApi";
import { resolveMediaUrl } from "../../../utils/media";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatInvoiceDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
};

const formatTaka = (value) => {
  const amount = toNumber(value);
  return `৳${amount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
};

const OrderInvoice = () => {
  const { invoiceId } = useParams();

  const {
    data: orderResponse,
    isLoading,
    isFetching,
  } = useAdminFetchQuery(
    { url: `/admin/orders/invoice/${invoiceId}`, tags: ["orders"] },
    { skip: !invoiceId },
  );

  const { data: settingResponse } = useAdminFetchQuery({
    url: "/v1/settings",
    tags: ["invoice-setting"],
  });

  const { data: siteDataResponse } = useAdminFetchQuery({
    url: "/v1/site-data",
    tags: ["invoice-site-data"],
  });

  const order = orderResponse?.data || null;
  const generalSetting = settingResponse?.data || null;
  const contact = siteDataResponse?.data?.contact || null;
  const loading = isLoading || isFetching;

  console.log(order);

  const items = useMemo(
    () => (Array.isArray(order?.orderdetails) ? order.orderdetails : []),
    [order?.orderdetails],
  );

  const subTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + toNumber(item.sale_price) * toNumber(item.qty),
        0,
      ),
    [items],
  );

  const shippingCharge = toNumber(order?.shipping_charge);
  const discount = toNumber(order?.discount);
  const finalTotal = subTotal + shippingCharge - discount;

  const logoUrl = resolveMediaUrl(
    generalSetting?.white_logo || generalSetting?.logo,
    null,
  );
  const paymentMethod = String(
    order?.payment?.payment_method || "",
  ).toUpperCase();
  const companyName =
    generalSetting?.name || process.env.NEXT_PUBLIC_APP_NAME || "-";
  const hotline = contact?.hotline || generalSetting?.hotline || "-";
  const companyEmail = contact?.email || "-";
  const companyAddress = contact?.address || "-";

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!order) {
    return <div className="p-6">Order not found</div>;
  }

  return (
    <div className="invoice-page-root">
      <style>
        {`
                    .customer-invoice {
                        margin: 97px 0 50px;
                    }
                    .invoice-page-root p {
                        margin: 0;
                    }
                    .invoice-page-root td {
                        font-size: 16px;
                        vertical-align: top;
                    }
                    .invoice-main {
                        width: 760px;
                        margin: 0 auto;
                        background: #fff;
                        overflow: hidden;
                        padding: 30px 30px 0;
                        box-shadow: 0 0 0 1px #f0f0f0;
                    }
                    .invoice-header-left {
                        width: 40%;
                        float: left;
                        padding-top: 15px;
                    }
                    .invoice-header-right {
                        width: 60%;
                        float: left;
                    }
                    .invoice-payment {
                        font-size: 14px;
                        color: #222;
                        margin: 20px 0;
                    }
                    .invoice-copy {
                        font-size: 16px;
                        line-height: 1.8;
                        color: #222;
                    }
                    .invoice-bar-primary {
                        background: #c4c1c1;
                        transform: skew(38deg);
                        width: 100%;
                        margin-left: 65px;
                        padding: 20px 60px;
                    }
                    .invoice-bar-primary p {
                        font-size: 30px;
                        color: #fff;
                        transform: skew(-38deg);
                        text-transform: uppercase;
                        text-align: right;
                        font-weight: bold;
                    }
                    .invoice-bar-secondary {
                        background: #fff;
                        transform: skew(36deg);
                        width: 72%;
                        margin-left: 182px;
                        padding: 12px 32px;
                        margin-top: 6px;
                    }
                    .invoice-bar-secondary p {
                        font-size: 15px;
                        color: #222;
                        font-weight: bold;
                        transform: skew(-36deg);
                        text-align: right;
                    }
                    .invoice-bar-secondary p:first-child {
                        padding-right: 18px;
                    }
                    .invoice-bar-secondary p:last-child {
                        padding-right: 32px;
                    }
                    .invoice-to {
                        padding-top: 20px;
                    }
                    .invoice-to p {
                        font-size: 16px;
                        line-height: 1.8;
                        color: #222;
                        text-align: right;
                    }
                    .invoice-table {
                        width: 100%;
                        margin-top: 30px;
                        margin-bottom: 0;
                        border-collapse: collapse;
                    }
                    .invoice-table thead {
                        background: #c4c1c1;
                        color: #fff;
                    }
                    .invoice-table th,
                    .invoice-table td {
                        border: 1px solid #e5e7eb;
                        padding: 8px;
                        text-align: left;
                    }
                    .invoice-table th:nth-child(3),
                    .invoice-table th:nth-child(4),
                    .invoice-table th:nth-child(5),
                    .invoice-table td:nth-child(3),
                    .invoice-table td:nth-child(4),
                    .invoice-table td:nth-child(5) {
                        white-space: nowrap;
                    }
                    .invoice-product {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .invoice-product .invoice-product-image {
                        width: 60px;
                        height: 60px;
                        object-fit: cover;
                        border-radius: 6px;
                        border: 1px solid #ddd;
                    }
                    .invoice-product .invoice-color-image {
                        width: auto;
                        height: 30px;
                        object-fit: contain;
                        border: 0;
                        border-radius: 0;
                        margin-left: 4px;
                        vertical-align: middle;
                    }
                    .invoice-total-table {
                        width: 300px;
                        float: right;
                        margin-bottom: 30px;
                        border-collapse: collapse;
                    }
                    .invoice-total-table tbody {
                        background: #f1f9f8;
                    }
                    .invoice-total-table td {
                        border: 1px solid #e5e7eb;
                        padding: 8px;
                    }
                    .invoice-total-table .invoice-final-total {
                        background: #c4c1c1;
                        color: #fff;
                    }
                    .terms-condition {
                        clear: both;
                        overflow: hidden;
                        width: 100%;
                        text-align: center;
                        padding: 20px 0;
                        border-top: 1px solid #ddd;
                    }
                    .terms-condition h5 {
                        margin: 0;
                        font-size: 1.25rem;
                    }
                    .terms-condition h5:first-child {
                        font-style: italic;
                    }
                    .terms-condition p {
                        text-align: center;
                        font-style: italic;
                        font-size: 15px;
                        margin-top: 10px;
                    }
                    .invoice-controls {
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    .invoice-controls .invoice-print-btn {
                        border: 0;
                        background: #198754;
                        color: #fff;
                        padding: 6px 12px;
                        border-radius: 6px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    }
                    .invoice-controls .invoice-print-btn:hover {
                        opacity: 0.95;
                    }
                    @page {
                        margin: 0;
                    }
                    @media (max-width: 900px) {
                        .invoice-main {
                            width: 100%;
                            padding: 20px 15px 0;
                        }
                        .invoice-header-left,
                        .invoice-header-right {
                            width: 100%;
                            float: none;
                        }
                        .invoice-bar-primary,
                        .invoice-bar-secondary {
                            margin-left: 0;
                            width: 100%;
                        }
                        .invoice-bar-primary p,
                        .invoice-bar-secondary p,
                        .invoice-to p {
                            text-align: left;
                            padding-right: 0 !important;
                        }
                        .invoice-total-table {
                            width: 100%;
                            float: none;
                        }
                        .customer-invoice {
                            margin-top: 20px;
                        }
                    }
                    @media print {
                        .invoice-main {
                            margin-left: -120px !important;
                            box-shadow: none;
                        }
                        .no-print,
                        .left-side-menu,
                        .navbar-custom,
                        footer {
                            display: none !important;
                        }
                        main {
                            padding: 0 !important;
                            overflow: visible !important;
                        }
                        .invoice-page-root td,
                        .invoice-page-root th {
                            font-size: 18px;
                        }
                    }
                `}
      </style>

      <section className="customer-invoice">
        <div className="container">
          <div className="invoice-controls no-print">
            <Link
              to="/orders/all"
              className="inline-flex items-center font-semibold text-gray-700">
              Back To Order
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="invoice-print-btn"
              aria-label="Print invoice">
              Print
            </button>
          </div>

          <div className="invoice-main">
            <table style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td className="invoice-header-left">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        width="90"
                        alt={companyName}
                        style={{ marginTop: 25 }}
                      />
                    ) : null}
                    <p className="invoice-payment">
                      <strong>Payment Method:</strong>{" "}
                      <span>{paymentMethod || "-"}</span>
                    </p>
                    <div>
                      <p className="invoice-copy">
                        <strong>Invoice From:</strong>
                      </p>
                      <p className="invoice-copy">{companyName}</p>
                      <p className="invoice-copy">{hotline}</p>
                      <p className="invoice-copy">{companyEmail}</p>
                      <p className="invoice-copy">{companyAddress}</p>
                    </div>
                  </td>
                  <td className="invoice-header-right">
                    <div className="invoice-bar-primary">
                      <p>Invoice</p>
                    </div>
                    <div className="invoice-bar-secondary">
                      <p>
                        Invoice ID : <strong>#{order.invoice_id}</strong>
                      </p>
                      <p>
                        Invoice Date:{" "}
                        <strong>{formatInvoiceDate(order.created_at)}</strong>
                      </p>
                    </div>
                    <div className="invoice-to">
                      <p>
                        <strong>Invoice To:</strong>
                      </p>
                      <p>{order.shipping?.name || ""}</p>
                      <p>{order.shipping?.address || ""}</p>
                      <p>{order.shipping?.phone || ""}</p>
                      <p>{order.shipping?.area || ""}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const productImageUrl = resolveMediaUrl(item.image, null);
                  const imageColorUrl = resolveMediaUrl(item.image_color, null);
                  const lineTotal =
                    toNumber(item.sale_price) * toNumber(item.qty);

                  return (
                    <tr key={item.id || `${item.product_name}-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="invoice-product">
                          {productImageUrl ? (
                            <img
                              src={productImageUrl}
                              alt={item.product_name || "Invoice image"}
                              className="invoice-product-image"
                            />
                          ) : null}
                          <div>
                            <strong>{item.product_name}</strong>
                            <br />
                            {item.product_size ? (
                              <span>Size: {item.product_size}</span>
                            ) : null}
                            {item.product_color ? (
                              <span>
                                {item.product_size ? ", " : ""}Color:{" "}
                                {item.product_color}
                              </span>
                            ) : null}
                            {imageColorUrl ? (
                              <span>
                                {item.product_size || item.product_color
                                  ? ", "
                                  : ""}
                                Color:{" "}
                                <img
                                  src={imageColorUrl}
                                  alt="Color"
                                  className="invoice-color-image"
                                />
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>{formatTaka(item.sale_price)}</td>
                      <td>{toNumber(item.qty)}</td>
                      <td>{formatTaka(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div>
              <table className="invoice-total-table">
                <tbody>
                  <tr>
                    <td>
                      <strong>SubTotal</strong>
                    </td>
                    <td>
                      <strong>{formatTaka(subTotal)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Shipping(+)</strong>
                    </td>
                    <td>
                      <strong>{formatTaka(shippingCharge)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Discount(-)</strong>
                    </td>
                    <td>
                      <strong>{formatTaka(discount)}</strong>
                    </td>
                  </tr>
                  <tr className="invoice-final-total">
                    <td>
                      <strong>Final Total</strong>
                    </td>
                    <td>
                      <strong>{formatTaka(finalTotal)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="terms-condition">
                <h5>
                  <a href="/terms-condition" target="_blank" rel="noreferrer">
                    Terms & Conditions
                  </a>
                </h5>
                <h5>
                  Customer Agree to the website{" "}
                  <span style={{ color: "#DF3130" }}>
                    Terms and Conditions, Return Policy
                  </span>
                </h5>
                <p>
                  * This is a computer generated invoice, does not require any
                  signature.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrderInvoice;
