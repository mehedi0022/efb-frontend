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

          .invoice-page-root::-webkit-scrollbar {
              display: none;
      }
          .invoice-page-root {
              -ms-overflow-style: none;  /* IE and Edge */
              scrollbar-width: none;  /* Firefox */
              background-color: #f4f5f7; /* Matches the grey side areas */
          }

          body {
              background-color: #f4f5f7 !important;
              margin: 0;
          }
          /* --- BASE STYLES --- */
          .invoice-page-root {
              background: #fff;
              padding-bottom: 50px;
          }
          .customer-invoice {
              margin: 0px auto;
              max-width: 800px;
          }
          .invoice-page-root p {
              margin: 0;
          }
          .invoice-page-root td {
              font-size: 15px;
              vertical-align: top;
          }
          .invoice-main {
              background: #fff;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              box-sizing: border-box;
          }
          
          /* --- TOP HEADER ALIGNMENT --- */
          .invoice-header-left {
              width: 50%;
              padding-top: 15px;
              vertical-align: top;
          }
          .invoice-header-right {
              width: 50%;
              vertical-align: top;
          }
          .invoice-payment {
              font-size: 14px;
              color: #222;
              margin: 20px 0;
          }
          .invoice-copy {
              font-size: 15px;
              line-height: 1.6;
              color: #222;
          }
          
          /* --- SKEW BANNERS --- */
          .invoice-bar-primary {
              background: #c4c1c1;
              transform: skew(38deg);
              width: 90%;
              margin-left: 30px;
              padding: 15px 40px;
          }
          .invoice-bar-primary p {
              font-size: 24px;
              color: #fff;
              transform: skew(-38deg);
              text-transform: uppercase;
              text-align: right;
              font-weight: bold;
              margin: 0;
          }
          .invoice-bar-secondary {
              background: #fff;
              transform: skew(36deg);
              width: 80%;
              margin-left: 60px;
              padding: 10px 25px;
              margin-top: 6px;
          }
          .invoice-bar-secondary p {
              font-size: 14px;
              color: #222;
              font-weight: bold;
              transform: skew(-36deg);
              text-align: right;
              margin: 0;
          }
          .invoice-to {
              padding-top: 20px;
              text-align: right;
              padding-right: 20px;
          }
          .invoice-to p {
              font-size: 15px;
              line-height: 1.6;
              color: #222;
          }
          
          /* --- TABLES --- */
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
              padding: 10px;
              text-align: left;
          }
          .invoice-product {
              display: flex;
              align-items: center;
              gap: 12px;
          }
          .invoice-product .invoice-product-image {
              width: 50px;
              height: 50px;
              object-fit: cover;
              border-radius: 4px;
              border: 1px solid #ddd;
          }
          
          /* --- TOTALS SUMMARY --- */
          .invoice-total-table {
              width: 320px;
              float: right;
              margin-top: 20px;
              margin-bottom: 30px;
              border-collapse: collapse;
          }
          .invoice-total-table tbody {
              background: #f1f9f8;
          }
          .invoice-total-table td {
              border: 1px solid #e5e7eb;
              padding: 10px;
          }
          .invoice-total-table .invoice-final-total {
              background: #c4c1c1;
              color: #fff;
          }
          
          /* --- FOOTER --- */
          .terms-condition {
              clear: both;
              width: 100%;
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #ddd;
          }
          .terms-condition h5 {
              margin: 0 0 5px 0;
              font-size: 1.1rem;
          }
          .terms-condition p {
              font-style: italic;
              font-size: 14px;
              color: #555;
          }
          .invoice-controls {
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              max-width: 800px;
              margin: 0 auto 15px auto;
          }
          .invoice-controls .invoice-print-btn {
              border: 0;
              background: #198754;
              color: #fff;
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
          }

          /* --- MOBILE RESPONSIVE (ONLY APPLIES TO SCREENS, NOT PRINT) --- */
          @media screen and (max-width: 900px) {
              .invoice-header-left,
              .invoice-header-right {
                  display: block;
                  width: 100%;
              }
              .invoice-bar-primary,
              .invoice-bar-secondary {
                  margin-left: 0;
                  width: 100%;
                  transform: none;
                  padding: 15px;
                  text-align: left;
              }
              .invoice-bar-primary p,
              .invoice-bar-secondary p,
              .invoice-to, .invoice-to p {
                  transform: none;
                  text-align: left;
                  padding-right: 0;
              }
              .invoice-total-table {
                  width: 100%;
                  float: none;
              }
          }

          /* --- PERFECT PRINT CONFIGURATION --- */
          @page {
              size: A4;
              margin: 0; /* REMOVES BROWSER HEADER & FOOTER (Date, URL, Page Number) */
          }

          @media print {
              /* Force pure white background on the entire page */
              body, html, .invoice-page-root {
                  overflow: hidden !important;
                  background: #fff !important;
                  margin: 0 !important;
                  padding: 0 !important;
              }
              
              /* Give the invoice safe padding inside the A4 paper */
              .customer-invoice {
                  margin: 0 !important;
                  padding: 15mm !important; 
                  max-width: 100% !important;
                  width: 100% !important;
              }

              .invoice-main {
                  padding: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  width: 100% !important;
              }

              /* Hide UI buttons and sidebars */
              .no-print, header, footer, nav, .left-side-menu, .navbar-custom {
                  display: none !important;
              }

              /* Force specific colors and backgrounds to render */
              * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
              }

              /* Ensure right side aligns properly */
              .invoice-total-table {
                  float: right !important;
              }

              /* Prevent products from being cut in half across pages */
              .invoice-table tr, .invoice-total-table tr {
                  page-break-inside: avoid;
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
