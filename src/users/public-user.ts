import { UserDocument } from './schemas/user.schema';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt?: Date;
}

export const aPublico = (user: UserDocument): PublicUser => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});
