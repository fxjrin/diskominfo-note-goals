export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string, id: number) {
    super(404, `${resource} with id ${id} not found`);
  }
}

export class ValidationError extends HttpError {
  constructor(details: unknown) {
    super(422, "Validation failed", details);
  }
}
