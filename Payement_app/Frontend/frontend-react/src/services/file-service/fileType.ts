
export type Files = {
  id: number;
  name: string;
  size: number;
  created_at: string;
  status: string;
  domain: string;
  technology: [];
  client_name: string;
  type: number;
};
export type NewFile = {
  attachment: FileList;
  domain: string;
  clientName: string;
  technologies: { name: string }[]; // multiple technologies
  fileType: string;
};

export const fileTypes=(type:number)=>{
  if(type===0) return "RFP"
  else return "Case Study"
}