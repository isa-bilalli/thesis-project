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
import {
  addLeadVehicleController,
  deleteLeadVehicleController,
  listLeadVehiclesController,
  updateLeadVehicleController,
} from "./lead-vehicle.controller.js";
import {
  createLeadActivityController,
  listLeadActivitiesController,
  updateLeadActivityController,
  updateLeadActivityStatusController,
} from "./lead-activity.controller.js";
import {
  createTestDriveController,
  getTestDriveByIdController,
  listTestDrivesController,
  updateTestDriveController,
  updateTestDriveStatusController,
} from "./test-drive.controller.js";

export const crmRouter = Router();

crmRouter.use("/tenant/customers", requireTenantAuth);
crmRouter.use("/tenant/leads", requireTenantAuth);
crmRouter.use("/tenant/lead-activities", requireTenantAuth);
crmRouter.use("/tenant/test-drives", requireTenantAuth);

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
  "/tenant/leads/:leadId/vehicles",
  requirePermission("crm.read"),
  listLeadVehiclesController,
);
crmRouter.post(
  "/tenant/leads/:leadId/vehicles",
  requirePermission("crm.write"),
  addLeadVehicleController,
);
crmRouter.post(
  "/tenant/leads/:leadId/activities",
  requirePermission("crm.write"),
  createLeadActivityController,
);
crmRouter.patch(
  "/tenant/leads/:leadId/vehicles/:vehicleId",
  requirePermission("crm.write"),
  updateLeadVehicleController,
);
crmRouter.delete(
  "/tenant/leads/:leadId/vehicles/:vehicleId",
  requirePermission("crm.write"),
  deleteLeadVehicleController,
);
crmRouter.get(
  "/tenant/lead-activities",
  requirePermission("crm.read"),
  listLeadActivitiesController,
);
crmRouter.patch(
  "/tenant/lead-activities/:activityId/status",
  requirePermission("crm.write"),
  updateLeadActivityStatusController,
);
crmRouter.patch(
  "/tenant/lead-activities/:activityId",
  requirePermission("crm.write"),
  updateLeadActivityController,
);
crmRouter.get(
  "/tenant/test-drives",
  requirePermission("crm.read"),
  listTestDrivesController,
);
crmRouter.post(
  "/tenant/test-drives",
  requirePermission("crm.write"),
  createTestDriveController,
);
crmRouter.get(
  "/tenant/test-drives/:testDriveId",
  requirePermission("crm.read"),
  getTestDriveByIdController,
);
crmRouter.patch(
  "/tenant/test-drives/:testDriveId/status",
  requirePermission("crm.write"),
  updateTestDriveStatusController,
);
crmRouter.patch(
  "/tenant/test-drives/:testDriveId",
  requirePermission("crm.write"),
  updateTestDriveController,
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
