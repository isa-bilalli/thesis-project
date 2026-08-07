import { Router } from "express";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { requireTenantAuth } from "../../shared/middleware/require-tenant-auth.js";
import {
  createCustomerController,
  createLeadController,
  deleteCustomerController,
  deleteLeadController,
  getCustomerByIdController,
  getLeadByIdController,
  listCustomersController,
  listLeadsController,
  restoreCustomerController,
  restoreLeadController,
  updateCustomerController,
  updateCustomerStatusController,
  updateLeadController,
  updateLeadStatusController,
} from "./crm.controller.js";

export const crmRouter = Router();

crmRouter.use("/tenant/customers", requireTenantAuth);
crmRouter.use("/tenant/leads", requireTenantAuth);

crmRouter.get(
  "/tenant/customers",
  requirePermission("crm.read"),
  listCustomersController,
);
crmRouter.post(
  "/tenant/customers",
  requirePermission("crm.write"),
  createCustomerController,
);
crmRouter.get(
  "/tenant/customers/:customerId",
  requirePermission("crm.read"),
  getCustomerByIdController,
);
crmRouter.post(
  "/tenant/customers/:customerId/restore",
  requirePermission("crm.write"),
  restoreCustomerController,
);
crmRouter.patch(
  "/tenant/customers/:customerId/status",
  requirePermission("crm.write"),
  updateCustomerStatusController,
);
crmRouter.patch(
  "/tenant/customers/:customerId",
  requirePermission("crm.write"),
  updateCustomerController,
);
crmRouter.delete(
  "/tenant/customers/:customerId",
  requirePermission("crm.write"),
  deleteCustomerController,
);
crmRouter.get(
  "/tenant/leads",
  requirePermission("crm.read"),
  listLeadsController,
);
crmRouter.post(
  "/tenant/leads",
  requirePermission("crm.write"),
  createLeadController,
);
crmRouter.get(
  "/tenant/leads/:leadId",
  requirePermission("crm.read"),
  getLeadByIdController,
);
crmRouter.post(
  "/tenant/leads/:leadId/restore",
  requirePermission("crm.write"),
  restoreLeadController,
);
crmRouter.patch(
  "/tenant/leads/:leadId/status",
  requirePermission("crm.write"),
  updateLeadStatusController,
);
crmRouter.patch(
  "/tenant/leads/:leadId",
  requirePermission("crm.write"),
  updateLeadController,
);
crmRouter.delete(
  "/tenant/leads/:leadId",
  requirePermission("crm.write"),
  deleteLeadController,
);
