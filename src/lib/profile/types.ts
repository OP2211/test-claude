export interface ProfileRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  mobile_number: string;
  team: string;
  avatar_url: string | null;
}

export interface ProfileInput {
  name: string;
  username: string;
  email: string;
  mobileNumber: string;
  team: string;
  avatarUrl?: string;
}
