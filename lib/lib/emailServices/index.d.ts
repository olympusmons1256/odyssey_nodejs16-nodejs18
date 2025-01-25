import { EmailProvidersConfiguration, UserEmailSettings } from "../systemDocTypes";
export interface EmailTemplateData {
    Sender: string;
    Organization: string;
    Space?: string;
}
export declare type SignInTemplates = "signin-v2" | "new-account";
export declare function generateUrl(urlParams: string): Promise<string>;
export declare function sendInviteEmail(postmarkStream: string, templateData: EmailTemplateData, templateId: string, userEmail: string, inviteLink: string, emailProvidersConfiguration?: EmailProvidersConfiguration, userEmailSettings?: UserEmailSettings): Promise<boolean | undefined>;
export declare function sendLogInCode(templateId: string, userEmail: string, logInLink: string, templateAlias: SignInTemplates, emailProvidersConfiguration?: EmailProvidersConfiguration, userEmailSettings?: UserEmailSettings): Promise<void>;
