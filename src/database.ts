export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type MenuRow = {
  id: string;
  title: string;
  service_date: string;
  order_deadline: string;
  pickup_start: string;
  pickup_end: string;
  location: string;
  notes: string;
  status: string;
  items: Json;
  created_at: string;
};
type OrderRow = {
  id: string;
  reference: string;
  menu_id: string;
  menu_title: string;
  teacher_name: string;
  email: string;
  room: string;
  note: string;
  status: string;
  items: Json;
  total: number;
  created_at: string;
};
export type Database = {
  public: {
    Tables: {
      menus: {
        Row: MenuRow;
        Insert: Omit<MenuRow, "created_at">;
        Update: Partial<Omit<MenuRow, "created_at">>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: never;
        Update: { status?: string };
        Relationships: [];
      };
      culinary_staff: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      place_order: {
        Args: {
          p_menu_id: string;
          p_teacher_name: string;
          p_email: string;
          p_room: string;
          p_note: string;
          p_items: Json;
          p_request_id: string;
        };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
