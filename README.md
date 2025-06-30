# Bulk Logistics

---

Welcome to the **Bulk Logistics** repository! We specialize in the **business-to-business (B2B) transport of goods**. If your delivery involves a direct consumer, you're in the wrong place – we focus solely on company-to-company logistics.

The entity that initiates a delivery order is responsible for payment. In short, **if you tell us what to do, you'll be the one paying.**

## Members

- Keith Hughes (TEAM LEAD)
- Gregory Maselle
- Lerato Taunyane
- Ndzalama Mabasa
- Vuyo (Joy) Mama

## Truck Routes

Our current primary routes facilitate the movement of goods between key industry players:

- **Electronic Suppliers -> Phone Companies:** Transporting components like cases and screens.
- **THoH -> Electronic Suppliers:** Moving essential raw materials and machinery.
- **Recycler -> Electronic Suppliers:** Supplying crucial raw materials recovered through recycling.

---

## Services and Functionality

Our platform provides the following core services:

### 1. Payment Service

- **Functionality:** Retrieve payment information.

### 2. Order Service

- **Functionality:**
  - Create new delivery orders.
  - Cancel existing delivery orders.
  - Track the status of deliveries.

### 3. User Service

- **Functionality:**
  - Create a company account to access our services.

---

## Public API Endpoints

Our API provides access to the functionalities listed above. Endpoints marked as **(Authed)** require an API key for access.

### Payment (Authed)

| Method | Endpoint           | Description              |
| :----- | :----------------- | :----------------------- |
| `GET`  | `/payment/details` | Get payment details/info |

### Order (Authed)

| Method   | Endpoint            | Description             |
| :------- | :------------------ | :---------------------- |
| `POST`   | `/order`            | Create a delivery order |
| `GET`    | `/order`            | Get all delivery orders |
| `DELETE` | `/order/:id`        | Cancel a delivery order |
| `GET`    | `/order/:id/status` | Get delivery status     |

### User

| Method | Endpoint         | Description              |
| :----- | :--------------- | :----------------------- |
| `POST` | `/user/register` | Create a company account |

---

### Authentication

**Authenticated endpoints** require an `ApiKey` in the request header. This `ApiKey` will be provided in the response when you successfully register a company account via the `/user/register` endpoint. **Ensure you store this `ApiKey` securely and use it for all subsequent authenticated requests with the header key `ApiKey`.**

## Database

[Here](https://dbdiagram.io/d/MiniConomy-Bulk-Logistics-6841dcf4ba2a4ac57b0997e1) is the link to our current database design.
