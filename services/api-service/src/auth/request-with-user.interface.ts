import { Request } from 'express';

export interface RequestUser {
  id: number;
}

export interface RequestWithUser extends Request {
  user: RequestUser;
}
