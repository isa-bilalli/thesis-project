import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createCustomer,
  createLead,
  deleteCustomer,
  deleteLead,
  getCustomerById,
  getLeadById,
  listCustomers,
  listLeads,
  restoreCustomer,
  restoreLead,
  updateCustomer,
  updateCustomerStatus,
  updateLead,
  updateLeadStatus,
  type UpdateCustomerChangesInput,
  type UpdateLeadChangesInput,
} from "./crm.service.js";

const CUSTOMER_WRITE_FIELDS = new Set([
  "customerType",
  "firstName",
  "lastName",
  "companyName",
  "email",
  "phone",
  "secondaryPhone",
  "addressLine1",
  "addressLine2",
  "city",
  "postalCode",
  "countryCode",
  "assignedToUserId",
  "notes",
]);

const LEAD_WRITE_FIELDS = new Set([
  "locationId",
  "customerId",
  "assignedToUserId",
  "source",
  "priority",
  "budgetMin",
  "budgetMax",
  "lastContactAt",
  "nextFollowUpAt",
  "notes",
]);

function parseObjectBody(body: unknown, requestName: string): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(400, `Invalid ${requestName} request`);
  }

  return body as Record<string, unknown>;
}

function rejectUnsupportedFields(
  body: Record<string, unknown>,
  allowedFields: ReadonlySet<string>,
  resourceName: string,
): void {
  const unsupportedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field),
  );

  if (unsupportedFields.length > 0) {
    throw new AppError(
      400,
      `Unsupported ${resourceName} fields: ${unsupportedFields.join(", ")}`,
    );
  }
}

export async function listCustomersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const result = await listCustomers({
      tenantId: request.auth.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
      customerType: request.query.customerType,
      assignedToUserId: request.query.assignedToUserId,
      search: request.query.search,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createCustomerController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const customerBody = parseObjectBody(request.body, "customer creation");
    rejectUnsupportedFields(customerBody, CUSTOMER_WRITE_FIELDS, "customer");

    const customer = await createCustomer({
      tenantId: request.auth.tenantId,
      createdByUserId: request.auth.userId,
      customerType: customerBody.customerType,
      firstName: customerBody.firstName,
      lastName: customerBody.lastName,
      companyName: customerBody.companyName,
      email: customerBody.email,
      phone: customerBody.phone,
      secondaryPhone: customerBody.secondaryPhone,
      addressLine1: customerBody.addressLine1,
      addressLine2: customerBody.addressLine2,
      city: customerBody.city,
      postalCode: customerBody.postalCode,
      countryCode: customerBody.countryCode,
      assignedToUserId: customerBody.assignedToUserId,
      notes: customerBody.notes,
    });

    response.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const customer = await getCustomerById({
      tenantId: request.auth.tenantId,
      customerId: request.params.customerId,
    });

    response.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const customerBody = parseObjectBody(request.body, "customer update");
    rejectUnsupportedFields(customerBody, CUSTOMER_WRITE_FIELDS, "customer");

    const customer = await updateCustomer({
      tenantId: request.auth.tenantId,
      customerId: request.params.customerId,
      changes: customerBody as UpdateCustomerChangesInput,
    });

    response.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const customerBody = parseObjectBody(
      request.body,
      "customer status update",
    );
    const fields = Object.keys(customerBody);

    if (fields.length !== 1 || fields[0] !== "status") {
      throw new AppError(
        400,
        "Customer status update request must contain only status",
      );
    }

    const customer = await updateCustomerStatus({
      tenantId: request.auth.tenantId,
      customerId: request.params.customerId,
      status: customerBody.status,
    });

    response.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomerController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    await deleteCustomer({
      tenantId: request.auth.tenantId,
      customerId: request.params.customerId,
    });

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function restoreCustomerController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body: unknown = request.body;

    if (
      body !== undefined &&
      (typeof body !== "object" ||
        body === null ||
        Array.isArray(body) ||
        Object.keys(body).length > 0)
    ) {
      throw new AppError(400, "Customer restore request must be empty");
    }

    const customer = await restoreCustomer({
      tenantId: request.auth.tenantId,
      customerId: request.params.customerId,
    });

    response.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
}

export async function listLeadsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const result = await listLeads({
      tenantId: request.auth.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
      priority: request.query.priority,
      source: request.query.source,
      locationId: request.query.locationId,
      customerId: request.query.customerId,
      assignedToUserId: request.query.assignedToUserId,
      search: request.query.search,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createLeadController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const leadBody = parseObjectBody(request.body, "lead creation");
    rejectUnsupportedFields(leadBody, LEAD_WRITE_FIELDS, "lead");

    const lead = await createLead({
      tenantId: request.auth.tenantId,
      createdByUserId: request.auth.userId,
      locationId: leadBody.locationId,
      customerId: leadBody.customerId,
      assignedToUserId: leadBody.assignedToUserId,
      source: leadBody.source,
      priority: leadBody.priority,
      budgetMin: leadBody.budgetMin,
      budgetMax: leadBody.budgetMax,
      lastContactAt: leadBody.lastContactAt,
      nextFollowUpAt: leadBody.nextFollowUpAt,
      notes: leadBody.notes,
    });

    response.status(201).json({ lead });
  } catch (error) {
    next(error);
  }
}

export async function getLeadByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const lead = await getLeadById({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
    });

    response.status(200).json({ lead });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const leadBody = parseObjectBody(request.body, "lead update");
    rejectUnsupportedFields(leadBody, LEAD_WRITE_FIELDS, "lead");

    const lead = await updateLead({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
      changes: leadBody as UpdateLeadChangesInput,
    });

    response.status(200).json({ lead });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const leadBody = parseObjectBody(request.body, "lead status update");
    const allowedFields = new Set(["status", "lostReason"]);
    rejectUnsupportedFields(leadBody, allowedFields, "lead status");

    if (!("status" in leadBody)) {
      throw new AppError(400, "status is required");
    }

    const lead = await updateLeadStatus({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
      actorUserId: request.auth.userId,
      status: leadBody.status,
      lostReason: leadBody.lostReason,
    });

    response.status(200).json({ lead });
  } catch (error) {
    next(error);
  }
}

export async function deleteLeadController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    await deleteLead({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
    });

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function restoreLeadController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body: unknown = request.body;

    if (
      body !== undefined &&
      (typeof body !== "object" ||
        body === null ||
        Array.isArray(body) ||
        Object.keys(body).length > 0)
    ) {
      throw new AppError(400, "Lead restore request must be empty");
    }

    const lead = await restoreLead({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
    });

    response.status(200).json({ lead });
  } catch (error) {
    next(error);
  }
}
