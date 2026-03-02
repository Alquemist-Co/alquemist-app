Connecting to db 5432
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_template_checklist: {
        Row: {
          created_at: string
          created_by: string | null
          expected_value: string | null
          id: string
          instruction: string
          is_critical: boolean
          requires_photo: boolean
          step_order: number
          template_id: string
          tolerance: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_value?: string | null
          id?: string
          instruction: string
          is_critical?: boolean
          requires_photo?: boolean
          step_order?: number
          template_id: string
          tolerance?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_value?: string | null
          id?: string
          instruction?: string
          is_critical?: boolean
          requires_photo?: boolean
          step_order?: number
          template_id?: string
          tolerance?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_template_checklist_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_template_phases: {
        Row: {
          id: string
          phase_id: string
          template_id: string
        }
        Insert: {
          id?: string
          phase_id: string
          template_id: string
        }
        Update: {
          id?: string
          phase_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_template_phases_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "production_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_template_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_template_resources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_optional: boolean
          notes: string | null
          product_id: string | null
          quantity: number
          quantity_basis: Database["public"]["Enums"]["quantity_basis"]
          sort_order: number
          template_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_optional?: boolean
          notes?: string | null
          product_id?: string | null
          quantity: number
          quantity_basis: Database["public"]["Enums"]["quantity_basis"]
          sort_order?: number
          template_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_optional?: boolean
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quantity_basis?: Database["public"]["Enums"]["quantity_basis"]
          sort_order?: number
          template_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_template_resources_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_templates: {
        Row: {
          activity_type_id: string
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          depends_on_template_id: string | null
          estimated_duration_min: number
          frequency: Database["public"]["Enums"]["activity_frequency"]
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          trigger_day_from: number | null
          trigger_day_to: number | null
          triggers_phase_change_id: string | null
          triggers_transformation: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_type_id: string
          code: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          depends_on_template_id?: string | null
          estimated_duration_min: number
          frequency: Database["public"]["Enums"]["activity_frequency"]
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          trigger_day_from?: number | null
          trigger_day_to?: number | null
          triggers_phase_change_id?: string | null
          triggers_transformation?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_type_id?: string
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          depends_on_template_id?: string | null
          estimated_duration_min?: number
          frequency?: Database["public"]["Enums"]["activity_frequency"]
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          trigger_day_from?: number | null
          trigger_day_to?: number | null
          triggers_phase_change_id?: string | null
          triggers_transformation?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_templates_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_templates_depends_on_template_id_fkey"
            columns: ["depends_on_template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_templates_triggers_phase_change_id_fkey"
            columns: ["triggers_phase_change_id"]
            isOneToOne: false
            referencedRelation: "production_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          legal_id: string | null
          name: string
          settings: Json | null
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          country: string
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          is_active?: boolean
          legal_id?: string | null
          name: string
          settings?: Json | null
          timezone: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          legal_id?: string | null
          name?: string
          settings?: Json | null
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crop_types: {
        Row: {
          category: Database["public"]["Enums"]["crop_category"]
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          regulatory_framework: string | null
          scientific_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["crop_category"]
          code: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          regulatory_framework?: string | null
          scientific_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["crop_category"]
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          regulatory_framework?: string | null
          scientific_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cultivars: {
        Row: {
          breeder: string | null
          code: string
          created_at: string
          created_by: string | null
          crop_type_id: string
          default_cycle_days: number | null
          density_plants_per_m2: number | null
          expected_dry_ratio: number | null
          expected_yield_per_plant_g: number | null
          genetics: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          optimal_conditions: Json | null
          phase_durations: Json | null
          quality_grade: string | null
          target_profile: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          breeder?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          crop_type_id: string
          default_cycle_days?: number | null
          density_plants_per_m2?: number | null
          expected_dry_ratio?: number | null
          expected_yield_per_plant_g?: number | null
          genetics?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          optimal_conditions?: Json | null
          phase_durations?: Json | null
          quality_grade?: string | null
          target_profile?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          breeder?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          crop_type_id?: string
          default_cycle_days?: number | null
          density_plants_per_m2?: number | null
          expected_dry_ratio?: number | null
          expected_yield_per_plant_g?: number | null
          genetics?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          optimal_conditions?: Json | null
          phase_durations?: Json | null
          quality_grade?: string | null
          target_profile?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cultivars_crop_type_id_fkey"
            columns: ["crop_type_id"]
            isOneToOne: false
            referencedRelation: "crop_types"
            referencedColumns: ["id"]
          },
        ]
      }
      cultivation_schedules: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          cultivar_id: string
          id: string
          is_active: boolean
          name: string
          phase_config: Json | null
          total_days: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          cultivar_id: string
          id?: string
          is_active?: boolean
          name: string
          phase_config?: Json | null
          total_days?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          cultivar_id?: string
          id?: string
          is_active?: boolean
          name?: string
          phase_config?: Json | null
          total_days?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cultivation_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultivation_schedules_cultivar_id_fkey"
            columns: ["cultivar_id"]
            isOneToOne: false
            referencedRelation: "cultivars"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          total_footprint_m2: number
          total_growing_area_m2: number
          total_plant_capacity: number
          type: Database["public"]["Enums"]["facility_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          total_footprint_m2: number
          total_growing_area_m2?: number
          total_plant_capacity?: number
          type: Database["public"]["Enums"]["facility_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          total_footprint_m2?: number
          total_growing_area_m2?: number
          total_plant_capacity?: number
          type?: Database["public"]["Enums"]["facility_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          batch_number: string | null
          company_id: string
          cost_per_unit: number | null
          created_at: string
          created_by: string | null
          expiration_date: string | null
          id: string
          lot_status: Database["public"]["Enums"]["lot_status"]
          product_id: string
          quantity_available: number
          quantity_committed: number
          quantity_reserved: number
          shipment_item_id: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          supplier_lot_number: string | null
          unit_id: string
          updated_at: string
          updated_by: string | null
          zone_id: string | null
        }
        Insert: {
          batch_number?: string | null
          company_id?: string
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          expiration_date?: string | null
          id?: string
          lot_status?: Database["public"]["Enums"]["lot_status"]
          product_id: string
          quantity_available?: number
          quantity_committed?: number
          quantity_reserved?: number
          shipment_item_id?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          supplier_lot_number?: string | null
          unit_id: string
          updated_at?: string
          updated_by?: string | null
          zone_id?: string | null
        }
        Update: {
          batch_number?: string | null
          company_id?: string
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          expiration_date?: string | null
          id?: string
          lot_status?: Database["public"]["Enums"]["lot_status"]
          product_id?: string
          quantity_available?: number
          quantity_committed?: number
          quantity_reserved?: number
          shipment_item_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          supplier_lot_number?: string | null
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_shipment_item_id_fkey"
            columns: ["shipment_item_id"]
            isOneToOne: false
            referencedRelation: "shipment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          activity_id: string | null
          batch_id: string | null
          company_id: string
          cost_per_unit: number | null
          cost_total: number | null
          id: string
          inventory_item_id: string
          phase_id: string | null
          quantity: number
          reason: string | null
          recipe_execution_id: string | null
          related_transaction_id: string | null
          target_item_id: string | null
          timestamp: string
          type: Database["public"]["Enums"]["transaction_type"]
          unit_id: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          activity_id?: string | null
          batch_id?: string | null
          company_id?: string
          cost_per_unit?: number | null
          cost_total?: number | null
          id?: string
          inventory_item_id: string
          phase_id?: string | null
          quantity: number
          reason?: string | null
          recipe_execution_id?: string | null
          related_transaction_id?: string | null
          target_item_id?: string | null
          timestamp?: string
          type: Database["public"]["Enums"]["transaction_type"]
          unit_id: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          activity_id?: string | null
          batch_id?: string | null
          company_id?: string
          cost_per_unit?: number | null
          cost_total?: number | null
          id?: string
          inventory_item_id?: string
          phase_id?: string | null
          quantity?: number
          reason?: string | null
          recipe_execution_id?: string | null
          related_transaction_id?: string | null
          target_item_id?: string | null
          timestamp?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          unit_id?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inv_tx_recipe_exec_fkey"
            columns: ["recipe_execution_id"]
            isOneToOne: false
            referencedRelation: "recipe_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_related_transaction_id_fkey"
            columns: ["related_transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_product_flows: {
        Row: {
          created_at: string
          created_by: string | null
          cultivar_id: string
          direction: Database["public"]["Enums"]["flow_direction"]
          expected_quantity_per_input: number | null
          expected_yield_pct: number | null
          id: string
          is_required: boolean
          notes: string | null
          phase_id: string
          product_category_id: string | null
          product_id: string | null
          product_role: Database["public"]["Enums"]["product_role"]
          sort_order: number
          unit_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cultivar_id: string
          direction: Database["public"]["Enums"]["flow_direction"]
          expected_quantity_per_input?: number | null
          expected_yield_pct?: number | null
          id?: string
          is_required?: boolean
          notes?: string | null
          phase_id: string
          product_category_id?: string | null
          product_id?: string | null
          product_role: Database["public"]["Enums"]["product_role"]
          sort_order?: number
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cultivar_id?: string
          direction?: Database["public"]["Enums"]["flow_direction"]
          expected_quantity_per_input?: number | null
          expected_yield_pct?: number | null
          id?: string
          is_required?: boolean
          notes?: string | null
          phase_id?: string
          product_category_id?: string | null
          product_id?: string | null
          product_role?: Database["public"]["Enums"]["product_role"]
          sort_order?: number
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_product_flows_cultivar_id_fkey"
            columns: ["cultivar_id"]
            isOneToOne: false
            referencedRelation: "cultivars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_product_flows_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "production_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_product_flows_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_product_flows_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppf_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_regulatory_requirements: {
        Row: {
          applies_to_scope: Database["public"]["Enums"]["compliance_scope"]
          category_id: string | null
          created_at: string
          created_by: string | null
          doc_type_id: string
          frequency: Database["public"]["Enums"]["compliance_frequency"]
          id: string
          is_mandatory: boolean
          notes: string | null
          product_id: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applies_to_scope: Database["public"]["Enums"]["compliance_scope"]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_type_id: string
          frequency: Database["public"]["Enums"]["compliance_frequency"]
          id?: string
          is_mandatory?: boolean
          notes?: string | null
          product_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applies_to_scope?: Database["public"]["Enums"]["compliance_scope"]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_type_id?: string
          frequency?: Database["public"]["Enums"]["compliance_frequency"]
          id?: string
          is_mandatory?: boolean
          notes?: string | null
          product_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_regulatory_requirements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_regulatory_requirements_doc_type_id_fkey"
            columns: ["doc_type_id"]
            isOneToOne: false
            referencedRelation: "regulatory_doc_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prr_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_phases: {
        Row: {
          can_be_entry_point: boolean
          can_be_exit_point: boolean
          can_skip: boolean
          code: string
          color: string | null
          created_at: string
          created_by: string | null
          crop_type_id: string
          default_duration_days: number | null
          depends_on_phase_id: string | null
          icon: string | null
          id: string
          is_destructive: boolean
          is_transformation: boolean
          name: string
          requires_zone_change: boolean
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          can_be_entry_point?: boolean
          can_be_exit_point?: boolean
          can_skip?: boolean
          code: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          crop_type_id: string
          default_duration_days?: number | null
          depends_on_phase_id?: string | null
          icon?: string | null
          id?: string
          is_destructive?: boolean
          is_transformation?: boolean
          name: string
          requires_zone_change?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          can_be_entry_point?: boolean
          can_be_exit_point?: boolean
          can_skip?: boolean
          code?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          crop_type_id?: string
          default_duration_days?: number | null
          depends_on_phase_id?: string | null
          icon?: string | null
          id?: string
          is_destructive?: boolean
          is_transformation?: boolean
          name?: string
          requires_zone_change?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_phases_crop_type_id_fkey"
            columns: ["crop_type_id"]
            isOneToOne: false
            referencedRelation: "crop_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_phases_depends_on_phase_id_fkey"
            columns: ["depends_on_phase_id"]
            isOneToOne: false
            referencedRelation: "production_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          company_id: string
          conversion_properties: Json | null
          created_at: string
          created_by: string | null
          cultivar_id: string | null
          default_price: number | null
          default_unit_id: string
          default_yield_pct: number | null
          density_g_per_ml: number | null
          id: string
          is_active: boolean
          lot_tracking: Database["public"]["Enums"]["lot_tracking"]
          name: string
          phi_days: number | null
          preferred_supplier_id: string | null
          price_currency: string | null
          procurement_type: Database["public"]["Enums"]["product_procurement_type"]
          rei_hours: number | null
          requires_regulatory_docs: boolean
          shelf_life_days: number | null
          sku: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id: string
          company_id?: string
          conversion_properties?: Json | null
          created_at?: string
          created_by?: string | null
          cultivar_id?: string | null
          default_price?: number | null
          default_unit_id: string
          default_yield_pct?: number | null
          density_g_per_ml?: number | null
          id?: string
          is_active?: boolean
          lot_tracking?: Database["public"]["Enums"]["lot_tracking"]
          name: string
          phi_days?: number | null
          preferred_supplier_id?: string | null
          price_currency?: string | null
          procurement_type?: Database["public"]["Enums"]["product_procurement_type"]
          rei_hours?: number | null
          requires_regulatory_docs?: boolean
          shelf_life_days?: number | null
          sku: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string
          company_id?: string
          conversion_properties?: Json | null
          created_at?: string
          created_by?: string | null
          cultivar_id?: string | null
          default_price?: number | null
          default_unit_id?: string
          default_yield_pct?: number | null
          density_g_per_ml?: number | null
          id?: string
          is_active?: boolean
          lot_tracking?: Database["public"]["Enums"]["lot_tracking"]
          name?: string
          phi_days?: number | null
          preferred_supplier_id?: string | null
          price_currency?: string | null
          procurement_type?: Database["public"]["Enums"]["product_procurement_type"]
          rei_hours?: number | null
          requires_regulatory_docs?: boolean
          shelf_life_days?: number | null
          sku?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_cultivar_id_fkey"
            columns: ["cultivar_id"]
            isOneToOne: false
            referencedRelation: "cultivars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_default_unit_id_fkey"
            columns: ["default_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_executions: {
        Row: {
          batch_id: string | null
          company_id: string
          created_at: string
          executed_at: string
          executed_by: string
          id: string
          output_quantity_actual: number | null
          output_quantity_expected: number
          recipe_id: string
          scale_factor: number
          yield_pct: number | null
        }
        Insert: {
          batch_id?: string | null
          company_id?: string
          created_at?: string
          executed_at?: string
          executed_by: string
          id?: string
          output_quantity_actual?: number | null
          output_quantity_expected: number
          recipe_id: string
          scale_factor?: number
          yield_pct?: number | null
        }
        Update: {
          batch_id?: string | null
          company_id?: string
          created_at?: string
          executed_at?: string
          executed_by?: string
          id?: string
          output_quantity_actual?: number | null
          output_quantity_expected?: number
          recipe_id?: string
          scale_factor?: number
          yield_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_executions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_executions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_executions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          base_quantity: number
          base_unit_id: string
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          items: Json
          name: string
          output_product_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_quantity: number
          base_unit_id: string
          code: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          output_product_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_quantity?: number
          base_unit_id?: string
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          output_product_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_output_product_id_fkey"
            columns: ["output_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_doc_types: {
        Row: {
          category: Database["public"]["Enums"]["doc_category"]
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          issuing_authority: string | null
          name: string
          required_fields: Json
          sort_order: number
          updated_at: string
          updated_by: string | null
          valid_for_days: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["doc_category"]
          code: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          issuing_authority?: string | null
          name: string
          required_fields?: Json
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          valid_for_days?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["doc_category"]
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          issuing_authority?: string | null
          name?: string
          required_fields?: Json
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          valid_for_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_doc_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_documents: {
        Row: {
          batch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          doc_type_id: string
          document_number: string | null
          expiry_date: string | null
          field_data: Json
          file_path: string | null
          id: string
          issue_date: string
          shipment_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          doc_type_id: string
          document_number?: string | null
          expiry_date?: string | null
          field_data?: Json
          file_path?: string | null
          id?: string
          issue_date: string
          shipment_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          doc_type_id?: string
          document_number?: string | null
          expiry_date?: string | null
          field_data?: Json
          file_path?: string | null
          id?: string
          issue_date?: string
          shipment_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_documents_doc_type_id_fkey"
            columns: ["doc_type_id"]
            isOneToOne: false
            referencedRelation: "regulatory_doc_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          code: string
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          default_lot_tracking: Database["public"]["Enums"]["lot_tracking"]
          icon: string | null
          id: string
          is_active: boolean
          is_consumable: boolean
          is_depreciable: boolean
          is_transformable: boolean
          name: string
          parent_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_lot_tracking?: Database["public"]["Enums"]["lot_tracking"]
          icon?: string | null
          id?: string
          is_active?: boolean
          is_consumable?: boolean
          is_depreciable?: boolean
          is_transformable?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_lot_tracking?: Database["public"]["Enums"]["lot_tracking"]
          icon?: string | null
          id?: string
          is_active?: boolean
          is_consumable?: boolean
          is_depreciable?: boolean
          is_transformable?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_doc_requirements: {
        Row: {
          applies_when: Database["public"]["Enums"]["shipment_doc_applies_when"]
          category_id: string | null
          created_at: string
          created_by: string | null
          doc_type_id: string
          id: string
          is_mandatory: boolean
          notes: string | null
          product_id: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          applies_when: Database["public"]["Enums"]["shipment_doc_applies_when"]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_type_id: string
          id?: string
          is_mandatory?: boolean
          notes?: string | null
          product_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          applies_when?: Database["public"]["Enums"]["shipment_doc_applies_when"]
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_type_id?: string
          id?: string
          is_mandatory?: boolean
          notes?: string | null
          product_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_doc_requirements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_doc_requirements_doc_type_id_fkey"
            columns: ["doc_type_id"]
            isOneToOne: false
            referencedRelation: "regulatory_doc_types"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          destination_zone_id: string | null
          expected_quantity: number
          expiration_date: string | null
          id: string
          inspection_data: Json | null
          inspection_notes: string | null
          inspection_result:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          inventory_item_id: string | null
          product_id: string
          received_quantity: number | null
          rejected_quantity: number | null
          shipment_id: string
          sort_order: number
          supplier_batch_ref: string | null
          supplier_lot_number: string | null
          transaction_id: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          destination_zone_id?: string | null
          expected_quantity: number
          expiration_date?: string | null
          id?: string
          inspection_data?: Json | null
          inspection_notes?: string | null
          inspection_result?:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          inventory_item_id?: string | null
          product_id: string
          received_quantity?: number | null
          rejected_quantity?: number | null
          shipment_id: string
          sort_order?: number
          supplier_batch_ref?: string | null
          supplier_lot_number?: string | null
          transaction_id?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          destination_zone_id?: string | null
          expected_quantity?: number
          expiration_date?: string | null
          id?: string
          inspection_data?: Json | null
          inspection_notes?: string | null
          inspection_result?:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          inventory_item_id?: string | null
          product_id?: string
          received_quantity?: number | null
          rejected_quantity?: number | null
          shipment_id?: string
          sort_order?: number
          supplier_batch_ref?: string | null
          supplier_lot_number?: string | null
          transaction_id?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_destination_zone_id_fkey"
            columns: ["destination_zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "si_inventory_item_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "si_transaction_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_arrival_date: string | null
          carrier_contact: string | null
          carrier_driver: string | null
          carrier_name: string | null
          carrier_vehicle: string | null
          company_id: string
          created_at: string
          created_by: string | null
          destination_facility_id: string
          dispatch_date: string | null
          estimated_arrival_date: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          notes: string | null
          origin_address: string | null
          origin_latitude: number | null
          origin_longitude: number | null
          origin_name: string | null
          purchase_order_ref: string | null
          received_by: string | null
          shipment_code: string
          status: Database["public"]["Enums"]["shipment_status"]
          supplier_id: string | null
          transport_conditions: Json | null
          type: Database["public"]["Enums"]["shipment_direction"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_arrival_date?: string | null
          carrier_contact?: string | null
          carrier_driver?: string | null
          carrier_name?: string | null
          carrier_vehicle?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          destination_facility_id: string
          dispatch_date?: string | null
          estimated_arrival_date?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          notes?: string | null
          origin_address?: string | null
          origin_latitude?: number | null
          origin_longitude?: number | null
          origin_name?: string | null
          purchase_order_ref?: string | null
          received_by?: string | null
          shipment_code: string
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_id?: string | null
          transport_conditions?: Json | null
          type: Database["public"]["Enums"]["shipment_direction"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_arrival_date?: string | null
          carrier_contact?: string | null
          carrier_driver?: string | null
          carrier_name?: string | null
          carrier_vehicle?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          destination_facility_id?: string
          dispatch_date?: string | null
          estimated_arrival_date?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          notes?: string | null
          origin_address?: string | null
          origin_latitude?: number | null
          origin_longitude?: number | null
          origin_name?: string | null
          purchase_order_ref?: string | null
          received_by?: string | null
          shipment_code?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_id?: string | null
          transport_conditions?: Json | null
          type?: Database["public"]["Enums"]["shipment_direction"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_destination_facility_id_fkey"
            columns: ["destination_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          company_id: string
          contact_info: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          payment_terms: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id?: string
          contact_info?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_terms?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          contact_info?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_terms?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      units_of_measure: {
        Row: {
          base_unit_id: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          dimension: Database["public"]["Enums"]["unit_dimension"]
          id: string
          name: string
          to_base_factor: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_unit_id?: string | null
          code: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          dimension: Database["public"]["Enums"]["unit_dimension"]
          id?: string
          name: string
          to_base_factor?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_unit_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          dimension?: Database["public"]["Enums"]["unit_dimension"]
          id?: string
          name?: string
          to_base_factor?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_of_measure_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_of_measure_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          assigned_facility_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          permissions: Json | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_facility_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          permissions?: Json | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_facility_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_assigned_facility"
            columns: ["assigned_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_structures: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_mobile: boolean
          length_m: number
          level_config: Json | null
          max_positions: number | null
          name: string
          num_levels: number
          positions_per_level: number | null
          pot_size_l: number | null
          spacing_cm: number | null
          type: Database["public"]["Enums"]["structure_type"]
          updated_at: string
          updated_by: string | null
          width_m: number
          zone_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_mobile?: boolean
          length_m: number
          level_config?: Json | null
          max_positions?: number | null
          name: string
          num_levels?: number
          positions_per_level?: number | null
          pot_size_l?: number | null
          spacing_cm?: number | null
          type: Database["public"]["Enums"]["structure_type"]
          updated_at?: string
          updated_by?: string | null
          width_m: number
          zone_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_mobile?: boolean
          length_m?: number
          level_config?: Json | null
          max_positions?: number | null
          name?: string
          num_levels?: number
          positions_per_level?: number | null
          pot_size_l?: number | null
          spacing_cm?: number | null
          type?: Database["public"]["Enums"]["structure_type"]
          updated_at?: string
          updated_by?: string | null
          width_m?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_structures_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          area_m2: number
          climate_config: Json | null
          created_at: string
          created_by: string | null
          effective_growing_area_m2: number
          environment: Database["public"]["Enums"]["zone_environment"]
          facility_id: string
          height_m: number | null
          id: string
          name: string
          plant_capacity: number
          purpose: Database["public"]["Enums"]["zone_purpose"]
          status: Database["public"]["Enums"]["zone_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_m2: number
          climate_config?: Json | null
          created_at?: string
          created_by?: string | null
          effective_growing_area_m2?: number
          environment: Database["public"]["Enums"]["zone_environment"]
          facility_id: string
          height_m?: number | null
          id?: string
          name: string
          plant_capacity?: number
          purpose: Database["public"]["Enums"]["zone_purpose"]
          status?: Database["public"]["Enums"]["zone_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_m2?: number
          climate_config?: Json | null
          created_at?: string
          created_by?: string | null
          effective_growing_area_m2?: number
          environment?: Database["public"]["Enums"]["zone_environment"]
          facility_id?: string
          height_m?: number | null
          id?: string
          name?: string
          plant_capacity?: number
          purpose?: Database["public"]["Enums"]["zone_purpose"]
          status?: Database["public"]["Enums"]["zone_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_confirm_shipment_receipt: {
        Args: { p_shipment_id: string; p_user_id: string }
        Returns: Json
      }
      fn_execute_recipe: {
        Args: {
          p_batch_id?: string
          p_output_quantity_actual?: number
          p_recipe_id: string
          p_scale_factor: number
          p_user_id: string
        }
        Returns: Json
      }
      get_my_company_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      activity_frequency: "daily" | "weekly" | "biweekly" | "once" | "on_demand"
      compliance_frequency:
        | "once"
        | "per_production"
        | "annual"
        | "per_shipment"
      compliance_scope: "per_batch" | "per_lot" | "per_product" | "per_facility"
      crop_category: "annual" | "perennial" | "biennial"
      doc_category:
        | "quality"
        | "transport"
        | "compliance"
        | "origin"
        | "safety"
        | "commercial"
      facility_type:
        | "indoor_warehouse"
        | "greenhouse"
        | "tunnel"
        | "open_field"
        | "vertical_farm"
      flow_direction: "input" | "output"
      inspection_result:
        | "accepted"
        | "accepted_with_observations"
        | "rejected"
        | "quarantine"
      lot_status: "available" | "quarantine" | "expired" | "depleted"
      lot_tracking: "required" | "optional" | "none"
      product_procurement_type: "purchased" | "produced" | "both"
      product_role: "primary" | "secondary" | "byproduct" | "waste"
      quantity_basis:
        | "fixed"
        | "per_plant"
        | "per_m2"
        | "per_zone"
        | "per_L_solution"
      shipment_direction: "inbound" | "outbound"
      shipment_doc_applies_when:
        | "always"
        | "interstate"
        | "international"
        | "regulated_material"
      shipment_status:
        | "scheduled"
        | "in_transit"
        | "received"
        | "inspecting"
        | "accepted"
        | "partial_accepted"
        | "rejected"
        | "cancelled"
      source_type: "purchase" | "production" | "transfer" | "transformation"
      structure_type:
        | "mobile_rack"
        | "fixed_rack"
        | "rolling_bench"
        | "row"
        | "bed"
        | "trellis_row"
        | "nft_channel"
      transaction_type:
        | "receipt"
        | "consumption"
        | "application"
        | "transfer_out"
        | "transfer_in"
        | "transformation_out"
        | "transformation_in"
        | "adjustment"
        | "waste"
        | "return"
        | "reservation"
        | "release"
      unit_dimension:
        | "mass"
        | "volume"
        | "count"
        | "area"
        | "energy"
        | "time"
        | "concentration"
      user_role: "admin" | "manager" | "supervisor" | "operator" | "viewer"
      zone_environment:
        | "indoor_controlled"
        | "greenhouse"
        | "tunnel"
        | "open_field"
      zone_purpose:
        | "propagation"
        | "vegetation"
        | "flowering"
        | "drying"
        | "processing"
        | "storage"
        | "multipurpose"
      zone_status: "active" | "maintenance" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_frequency: ["daily", "weekly", "biweekly", "once", "on_demand"],
      compliance_frequency: [
        "once",
        "per_production",
        "annual",
        "per_shipment",
      ],
      compliance_scope: ["per_batch", "per_lot", "per_product", "per_facility"],
      crop_category: ["annual", "perennial", "biennial"],
      doc_category: [
        "quality",
        "transport",
        "compliance",
        "origin",
        "safety",
        "commercial",
      ],
      facility_type: [
        "indoor_warehouse",
        "greenhouse",
        "tunnel",
        "open_field",
        "vertical_farm",
      ],
      flow_direction: ["input", "output"],
      inspection_result: [
        "accepted",
        "accepted_with_observations",
        "rejected",
        "quarantine",
      ],
      lot_status: ["available", "quarantine", "expired", "depleted"],
      lot_tracking: ["required", "optional", "none"],
      product_procurement_type: ["purchased", "produced", "both"],
      product_role: ["primary", "secondary", "byproduct", "waste"],
      quantity_basis: [
        "fixed",
        "per_plant",
        "per_m2",
        "per_zone",
        "per_L_solution",
      ],
      shipment_direction: ["inbound", "outbound"],
      shipment_doc_applies_when: [
        "always",
        "interstate",
        "international",
        "regulated_material",
      ],
      shipment_status: [
        "scheduled",
        "in_transit",
        "received",
        "inspecting",
        "accepted",
        "partial_accepted",
        "rejected",
        "cancelled",
      ],
      source_type: ["purchase", "production", "transfer", "transformation"],
      structure_type: [
        "mobile_rack",
        "fixed_rack",
        "rolling_bench",
        "row",
        "bed",
        "trellis_row",
        "nft_channel",
      ],
      transaction_type: [
        "receipt",
        "consumption",
        "application",
        "transfer_out",
        "transfer_in",
        "transformation_out",
        "transformation_in",
        "adjustment",
        "waste",
        "return",
        "reservation",
        "release",
      ],
      unit_dimension: [
        "mass",
        "volume",
        "count",
        "area",
        "energy",
        "time",
        "concentration",
      ],
      user_role: ["admin", "manager", "supervisor", "operator", "viewer"],
      zone_environment: [
        "indoor_controlled",
        "greenhouse",
        "tunnel",
        "open_field",
      ],
      zone_purpose: [
        "propagation",
        "vegetation",
        "flowering",
        "drying",
        "processing",
        "storage",
        "multipurpose",
      ],
      zone_status: ["active", "maintenance", "inactive"],
    },
  },
} as const

