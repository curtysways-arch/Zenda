// src/core/experience/ExperienceRegistry.ts
// Registro declarativo para la resolución de componentes visuales de la interfaz

export class ExperienceRegistry {
  private static landings = new Map<string, any>();
  private static admins = new Map<string, any>();
  private static dashboards = new Map<string, any>();
  private static workflows = new Map<string, any>();
  private static themes = new Map<string, any>();
  private static cards = new Map<string, any>();
  private static forms = new Map<string, any>();
  private static tables = new Map<string, any>();

  // Landing Templates
  static registerLanding(id: string, component: any) {
    this.landings.set(id, component);
  }
  static getLanding(id: string): any {
    return this.landings.get(id) || this.landings.get('DefaultLanding');
  }

  // Admin Templates
  static registerAdmin(id: string, component: any) {
    this.admins.set(id, component);
  }
  static getAdmin(id: string): any {
    return this.admins.get(id) || this.admins.get('AdminSidebarLayout');
  }

  // Dashboard Layouts
  static registerDashboard(id: string, component: any) {
    this.dashboards.set(id, component);
  }
  static getDashboard(id: string): any {
    return this.dashboards.get(id);
  }

  // Workflow Layouts
  static registerWorkflow(id: string, component: any) {
    this.workflows.set(id, component);
  }
  static getWorkflow(id: string): any {
    return this.workflows.get(id);
  }

  // Theme Packs
  static registerTheme(id: string, themeConfig: any) {
    this.themes.set(id, themeConfig);
  }
  static getTheme(id: string): any {
    return this.themes.get(id) || { primaryColor: '#7c3aed', secondaryColor: '#4f46e5' };
  }

  // Cards Packs
  static registerCards(id: string, component: any) {
    this.cards.set(id, component);
  }
  static getCards(id: string): any {
    return this.cards.get(id);
  }

  // Forms Packs
  static registerForms(id: string, component: any) {
    this.forms.set(id, component);
  }
  static getForms(id: string): any {
    return this.forms.get(id);
  }

  // Tables Packs
  static registerTables(id: string, component: any) {
    this.tables.set(id, component);
  }
  static getTables(id: string): any {
    return this.tables.get(id);
  }
}
