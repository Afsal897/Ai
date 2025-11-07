export type User = {
  id: number;
  name: string;
  email: string;
  role: number;
  status: number;
};

export type NewUser = {
  name?: string;
  email: string
  role:number;
};
