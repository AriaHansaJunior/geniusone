export interface PphRecord {
  id: string;
  name: string;
  rate: number;
  deduction: string;
  type?: string;
  typeId?: number | string;
  hidden?: boolean;
}
