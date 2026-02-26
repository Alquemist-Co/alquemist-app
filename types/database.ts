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
          id: string
          template_id: string
          step_order: number
          instruction: string
          is_critical: boolean
          requires_photo: boolean
          expected_value: string | null
          tolerance: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          template_id: string
          step_order?: number
          instruction: string
          is_critical?: boolean
          requires_photo?: boolean
          expected_value?: string | null
          tolerance?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          step_order?: number
          instruction?: string
          is_critical?: boolean
          requires_photo?: boolean
          expected_value?: string | null
          tolerance?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
          template_id: string
          phase_id: string
        }
        Insert: {
          id?: string
          template_id: string
          phase_id: string
        }
        Update: {
          id?: string
          template_id?: string
          phase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_template_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_template_phases_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "production_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_template_resources: {
        Row: {
          id: string
          template_id: string
          product_id: string | null
          quantity: number
          quantity_basis: Database["public"]["Enums"]["quantity_basis"]
          is_optional: boolean
          sort_order: number
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          template_id: string
          product_id?: string | null
          quantity: number
          quantity_basis: Database["public"]["Enums"]["quantity_basis"]
          is_optional?: boolean
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          product_id?: string | null
          quantity?: number
          quantity_basis?: Database["public"]["Enums"]["quantity_basis"]
          is_optional?: boolean
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
          id: string
          company_id: string
          code: string
          activity_type_id: string
          name: string
          frequency: Database["public"]["Enums"]["activity_frequency"]
          estimated_duration_min: number
          trigger_day_from: number | null
          trigger_day_to: number | null
          depends_on_template_id: string | null
          triggers_phase_change_id: string | null
          triggers_transformation: boolean
          metadata: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string
          code: string
          activity_type_id: string
          name: string
          frequency: Database["public"]["Enums"]["activity_frequency"]
          estimated_duration_min: number
          trigger_day_from?: number | null
          trigger_day_to?: number | null
          depends_on_template_id?: string | null
          triggers_phase_change_id?: string | null
          triggers_transformation?: boolean
          metadata?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          code?: string
          activity_type_id?: string
          name?: string
          frequency?: Database["public"]["Enums"]["activity_frequency"]
          estimated_duration_min?: number
          trigger_day_from?: number | null
          trigger_day_to?: number | null
          depends_on_template_id?: string | null
          triggers_phase_change_id?: string | null
          triggers_transformation?: boolean
          metadata?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_templates_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
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
          id: string
          company_id: string
          name: string
          category: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string
          name: string
          category?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          category?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
      cultivars: {
        Row: {
          id: string
          crop_type_id: string
          code: string
          name: string
          breeder: string | null
          genetics: string | null
          default_cycle_days: number | null
          phase_durations: Json | null
          expected_yield_per_plant_g: number | null
          expected_dry_ratio: number | null
          target_profile: Json | null
          quality_grade: string | null
          optimal_conditions: Json | null
          density_plants_per_m2: number | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          crop_type_id: string
          code: string
          name: string
          breeder?: string | null
          genetics?: string | null
          default_cycle_days?: number | null
          phase_durations?: Json | null
          expected_yield_per_plant_g?: number | null
          expected_dry_ratio?: number | null
          target_profile?: Json | null
          quality_grade?: string | null
          optimal_conditions?: Json | null
          density_plants_per_m2?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          crop_type_id?: string
          code?: string
          name?: string
          breeder?: string | null
          genetics?: string | null
          default_cycle_days?: number | null
          phase_durations?: Json | null
          expected_yield_per_plant_g?: number | null
          expected_dry_ratio?: number | null
          target_profile?: Json | null
          quality_grade?: string | null
          optimal_conditions?: Json | null
          density_plants_per_m2?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
          id: string
          company_id: string
          name: string
          cultivar_id: string
          total_days: number | null
          phase_config: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string
          name: string
          cultivar_id: string
          total_days?: number | null
          phase_config?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          cultivar_id?: string
          total_days?: number | null
          phase_config?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
      crop_types: {
        Row: {
          id: string
          company_id: string
          code: string
          name: string
          scientific_name: string | null
          category: Database["public"]["Enums"]["crop_category"]
          regulatory_framework: string | null
          icon: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string
          code: string
          name: string
          scientific_name?: string | null
          category: Database["public"]["Enums"]["crop_category"]
          regulatory_framework?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          code?: string
          name?: string
          scientific_name?: string | null
          category?: Database["public"]["Enums"]["crop_category"]
          regulatory_framework?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
      production_phases: {
        Row: {
          id: string
          crop_type_id: string
          code: string
          name: string
          sort_order: number
          default_duration_days: number | null
          is_transformation: boolean
          is_destructive: boolean
          requires_zone_change: boolean
          can_skip: boolean
          can_be_entry_point: boolean
          can_be_exit_point: boolean
          depends_on_phase_id: string | null
          icon: string | null
          color: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          crop_type_id: string
          code: string
          name: string
          sort_order?: number
          default_duration_days?: number | null
          is_transformation?: boolean
          is_destructive?: boolean
          requires_zone_change?: boolean
          can_skip?: boolean
          can_be_entry_point?: boolean
          can_be_exit_point?: boolean
          depends_on_phase_id?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          crop_type_id?: string
          code?: string
          name?: string
          sort_order?: number
          default_duration_days?: number | null
          is_transformation?: boolean
          is_destructive?: boolean
          requires_zone_change?: boolean
          can_skip?: boolean
          can_be_entry_point?: boolean
          can_be_exit_point?: boolean
          depends_on_phase_id?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
      phase_product_flows: {
        Row: {
          id: string
          cultivar_id: string
          phase_id: string
          direction: Database["public"]["Enums"]["flow_direction"]
          product_role: Database["public"]["Enums"]["product_role"]
          product_id: string | null
          product_category_id: string | null
          expected_yield_pct: number | null
          expected_quantity_per_input: number | null
          unit_id: string | null
          is_required: boolean
          sort_order: number
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          cultivar_id: string
          phase_id: string
          direction: Database["public"]["Enums"]["flow_direction"]
          product_role: Database["public"]["Enums"]["product_role"]
          product_id?: string | null
          product_category_id?: string | null
          expected_yield_pct?: number | null
          expected_quantity_per_input?: number | null
          unit_id?: string | null
          is_required?: boolean
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          cultivar_id?: string
          phase_id?: string
          direction?: Database["public"]["Enums"]["flow_direction"]
          product_role?: Database["public"]["Enums"]["product_role"]
          product_id?: string | null
          product_category_id?: string | null
          expected_yield_pct?: number | null
          expected_quantity_per_input?: number | null
          unit_id?: string | null
          is_required?: boolean
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
        ]
      }
      resource_categories: {
        Row: {
          id: string
          company_id: string
          parent_id: string | null
          code: string
          name: string
          icon: string | null
          color: string | null
          is_consumable: boolean
          is_depreciable: boolean
          is_transformable: boolean
          default_lot_tracking: Database["public"]["Enums"]["lot_tracking"]
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string
          parent_id?: string | null
          code: string
          name: string
          icon?: string | null
          color?: string | null
          is_consumable?: boolean
          is_depreciable?: boolean
          is_transformable?: boolean
          default_lot_tracking?: Database["public"]["Enums"]["lot_tracking"]
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          parent_id?: string | null
          code?: string
          name?: string
          icon?: string | null
          color?: string | null
          is_consumable?: boolean
          is_depreciable?: boolean
          is_transformable?: boolean
          default_lot_tracking?: Database["public"]["Enums"]["lot_tracking"]
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
      regulatory_doc_types: {
        Row: {
          id: string
          company_id: string
          code: string
          name: string
          description: string | null
          category: Database["public"]["Enums"]["doc_category"]
          valid_for_days: number | null
          issuing_authority: string | null
          required_fields: Json
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string
          code: string
          name: string
          description?: string | null
          category: Database["public"]["Enums"]["doc_category"]
          valid_for_days?: number | null
          issuing_authority?: string | null
          required_fields?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          code?: string
          name?: string
          description?: string | null
          category?: Database["public"]["Enums"]["doc_category"]
          valid_for_days?: number | null
          issuing_authority?: string | null
          required_fields?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
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
      product_regulatory_requirements: {
        Row: {
          id: string
          product_id: string | null
          category_id: string | null
          doc_type_id: string
          is_mandatory: boolean
          applies_to_scope: Database["public"]["Enums"]["compliance_scope"]
          frequency: Database["public"]["Enums"]["compliance_frequency"]
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          category_id?: string | null
          doc_type_id: string
          is_mandatory?: boolean
          applies_to_scope: Database["public"]["Enums"]["compliance_scope"]
          frequency: Database["public"]["Enums"]["compliance_frequency"]
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          category_id?: string | null
          doc_type_id?: string
          is_mandatory?: boolean
          applies_to_scope?: Database["public"]["Enums"]["compliance_scope"]
          frequency?: Database["public"]["Enums"]["compliance_frequency"]
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_regulatory_requirements_doc_type_id_fkey"
            columns: ["doc_type_id"]
            isOneToOne: false
            referencedRelation: "regulatory_doc_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_regulatory_requirements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_doc_requirements: {
        Row: {
          id: string
          product_id: string | null
          category_id: string | null
          doc_type_id: string
          is_mandatory: boolean
          applies_when: Database["public"]["Enums"]["shipment_doc_applies_when"]
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          category_id?: string | null
          doc_type_id: string
          is_mandatory?: boolean
          applies_when: Database["public"]["Enums"]["shipment_doc_applies_when"]
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          category_id?: string | null
          doc_type_id?: string
          is_mandatory?: boolean
          applies_when?: Database["public"]["Enums"]["shipment_doc_applies_when"]
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_doc_requirements_doc_type_id_fkey"
            columns: ["doc_type_id"]
            isOneToOne: false
            referencedRelation: "regulatory_doc_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_doc_requirements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      units_of_measure: {
        Row: {
          id: string
          company_id: string
          code: string
          name: string
          dimension: Database["public"]["Enums"]["unit_dimension"]
          base_unit_id: string | null
          to_base_factor: number
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string
          code: string
          name: string
          dimension: Database["public"]["Enums"]["unit_dimension"]
          base_unit_id?: string | null
          to_base_factor?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          code?: string
          name?: string
          dimension?: Database["public"]["Enums"]["unit_dimension"]
          base_unit_id?: string | null
          to_base_factor?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_of_measure_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_of_measure_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
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
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_company_id: { Args: never; Returns: string }
    }
    Enums: {
      activity_frequency: "daily" | "weekly" | "biweekly" | "once" | "on_demand"
      compliance_frequency: "once" | "per_production" | "annual" | "per_shipment"
      compliance_scope: "per_batch" | "per_lot" | "per_product" | "per_facility"
      crop_category: "annual" | "perennial" | "biennial"
      doc_category: "quality" | "transport" | "compliance" | "origin" | "safety" | "commercial"
      flow_direction: "input" | "output"
      lot_tracking: "required" | "optional" | "none"
      product_role: "primary" | "secondary" | "byproduct" | "waste"
      quantity_basis: "fixed" | "per_plant" | "per_m2" | "per_zone" | "per_L_solution"
      shipment_doc_applies_when: "always" | "interstate" | "international" | "regulated_material"
      unit_dimension: "mass" | "volume" | "count" | "area" | "energy" | "time" | "concentration"
      user_role: "admin" | "manager" | "supervisor" | "operator" | "viewer"
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
      compliance_frequency: ["once", "per_production", "annual", "per_shipment"],
      compliance_scope: ["per_batch", "per_lot", "per_product", "per_facility"],
      crop_category: ["annual", "perennial", "biennial"],
      doc_category: ["quality", "transport", "compliance", "origin", "safety", "commercial"],
      flow_direction: ["input", "output"],
      lot_tracking: ["required", "optional", "none"],
      product_role: ["primary", "secondary", "byproduct", "waste"],
      quantity_basis: ["fixed", "per_plant", "per_m2", "per_zone", "per_L_solution"],
      shipment_doc_applies_when: ["always", "interstate", "international", "regulated_material"],
      unit_dimension: ["mass", "volume", "count", "area", "energy", "time", "concentration"],
      user_role: ["admin", "manager", "supervisor", "operator", "viewer"],
    },
  },
} as const

