import {Request} from 'express';

export interface KYCRequest extends Request {
  userIP: String,
  deviceID: String,
}

export interface User {
  id: String,
  name: String,
  email: String,
  photo_url: String,
  created_at: Number,
  ban_reason?: Object
}

export interface AuthedRequest extends KYCRequest {
  user: User
}

export interface FirebaseAuth {
  uid: String,
  picture: String,
  name: String,
  email: String,
  email_verified: Boolean,
}
