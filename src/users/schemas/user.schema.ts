import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  // 🔸 Especifica el tipo de _id si lo usas directamente
  _id?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password?: string;
}

// 🔸 Declara que tu documento usa ObjectId como _id
export type UserDocument = Document<unknown, any, User> &
  User & { _id: Types.ObjectId };

export const UserSchema = SchemaFactory.createForClass(User);
