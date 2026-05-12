export class HttpError extends Error {
  constructor(status, message, code = 'error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message, code = 'bad_request') =>
  new HttpError(400, message, code);

export const unauthorized = (message = '请先登录', code = 'unauthorized') =>
  new HttpError(401, message, code);

export const forbidden = (message = '没有操作权限', code = 'forbidden') =>
  new HttpError(403, message, code);

export const notFound = (message = '资源不存在', code = 'not_found') =>
  new HttpError(404, message, code);

