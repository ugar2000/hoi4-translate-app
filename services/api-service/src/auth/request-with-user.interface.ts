import { Request } from 'express';

export interface RequestUser {
  userId: number;
}

export interface RequestWithUser extends Request {
  user: RequestUser;
}
