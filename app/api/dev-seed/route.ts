import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEV_USER_ID, isDevRequest } from '@/lib/dev';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
const c = (i: number) => COLORS[i % COLORS.length];

const rect = (y: number, page = 1) => ({ x: 0.25, y, width: 0.45, height: 0.03, pageNumber: page });

export async function POST(request: NextRequest) {
  if (!isDevRequest(request)) {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Wipe existing dev data
  await admin.from('client_documents').delete().eq('user_id', DEV_USER_ID);
  await admin.from('clients').delete().eq('user_id', DEV_USER_ID);
  await admin.from('templates').delete().eq('user_id', DEV_USER_ID);

  // ── Clients ──────────────────────────────────────────────────────────────
  const clientIds = {
    mitchell: uuidv4(),
    okafor:   uuidv4(),
    sharma:   uuidv4(),
    chen:     uuidv4(),
    beaumont: uuidv4(),
    nguyen:   uuidv4(),
  };

  await admin.from('clients').insert([
    { id: clientIds.mitchell, user_id: DEV_USER_ID, name: 'Sarah Mitchell',  email: 'sarah.mitchell@horizonlaw.ca',    company: 'Horizon Law Group',      created_at: daysAgo(45) },
    { id: clientIds.okafor,   user_id: DEV_USER_ID, name: 'James Okafor',    email: 'j.okafor@oakmedical.com',         company: 'Oak Medical Clinic',     created_at: daysAgo(30) },
    { id: clientIds.sharma,   user_id: DEV_USER_ID, name: 'Priya Sharma',    email: 'priya.sharma@truenorthcpa.ca',    company: 'True North CPA',         created_at: daysAgo(22) },
    { id: clientIds.chen,     user_id: DEV_USER_ID, name: 'David Chen',      email: 'd.chen@chenrealty.com',           company: 'Chen Realty Group',      created_at: daysAgo(14) },
    { id: clientIds.beaumont, user_id: DEV_USER_ID, name: 'Marie Beaumont',  email: 'm.beaumont@beaumontnotaires.ca',  company: 'Beaumont Notaires',      created_at: daysAgo(8) },
    { id: clientIds.nguyen,   user_id: DEV_USER_ID, name: 'Thomas Nguyen',   email: 't.nguyen@nguyenlogistics.com',    company: 'Nguyen Logistics Inc.',  created_at: daysAgo(2) },
  ]);

  // ── Templates ─────────────────────────────────────────────────────────────
  const templateIds = {
    nda:      uuidv4(),
    service:  uuidv4(),
    intake:   uuidv4(),
    claim:    uuidv4(),
  };

  await admin.from('templates').insert([
    {
      id: templateIds.nda,
      user_id: DEV_USER_ID,
      name: 'Non-Disclosure Agreement',
      file_name: 'NDA_Template.docx',
      file_type: 'word',
      file_url: 'dev/templates/nda.docx',
      uploaded_at: daysAgo(60),
      page_count: 2,
      fields: [
        { id: uuidv4(), fieldName: 'Client Name',   placeholder: '{{Client Name}}',   rectangle: rect(0.12), color: c(0) },
        { id: uuidv4(), fieldName: 'Company',        placeholder: '{{Company}}',        rectangle: rect(0.18), color: c(1) },
        { id: uuidv4(), fieldName: 'Address',        placeholder: '{{Address}}',        rectangle: rect(0.24), color: c(2) },
        { id: uuidv4(), fieldName: 'City',           placeholder: '{{City}}',           rectangle: rect(0.30), color: c(3) },
        { id: uuidv4(), fieldName: 'Province',       placeholder: '{{Province}}',       rectangle: rect(0.36), color: c(4) },
        { id: uuidv4(), fieldName: 'Postal Code',    placeholder: '{{Postal Code}}',    rectangle: rect(0.42), color: c(5) },
        { id: uuidv4(), fieldName: 'Date',           placeholder: '{{Date}}',           rectangle: rect(0.48), color: c(6) },
        { id: uuidv4(), fieldName: 'Authorized By',  placeholder: '{{Authorized By}}',  rectangle: rect(0.82), color: c(7) },
      ],
    },
    {
      id: templateIds.service,
      user_id: DEV_USER_ID,
      name: 'Service Agreement',
      file_name: 'Service_Agreement_Template.docx',
      file_type: 'word',
      file_url: 'dev/templates/service.docx',
      uploaded_at: daysAgo(55),
      page_count: 3,
      fields: [
        { id: uuidv4(), fieldName: 'Client Name',        placeholder: '{{Client Name}}',        rectangle: rect(0.10), color: c(0) },
        { id: uuidv4(), fieldName: 'Company',            placeholder: '{{Company}}',            rectangle: rect(0.16), color: c(1) },
        { id: uuidv4(), fieldName: 'Address',            placeholder: '{{Address}}',            rectangle: rect(0.22), color: c(2) },
        { id: uuidv4(), fieldName: 'City',               placeholder: '{{City}}',               rectangle: rect(0.28), color: c(3) },
        { id: uuidv4(), fieldName: 'Province',           placeholder: '{{Province}}',           rectangle: rect(0.34), color: c(4) },
        { id: uuidv4(), fieldName: 'Date',               placeholder: '{{Date}}',               rectangle: rect(0.40), color: c(5) },
        { id: uuidv4(), fieldName: 'Service Description',placeholder: '{{Service Description}}',rectangle: rect(0.52), color: c(6) },
        { id: uuidv4(), fieldName: 'Fee',                placeholder: '{{Fee}}',                rectangle: rect(0.60), color: c(7) },
        { id: uuidv4(), fieldName: 'Payment Terms',      placeholder: '{{Payment Terms}}',      rectangle: rect(0.66), color: c(0) },
        { id: uuidv4(), fieldName: 'Duration',           placeholder: '{{Duration}}',           rectangle: rect(0.72), color: c(1) },
        { id: uuidv4(), fieldName: 'Signature',          placeholder: '{{Signature}}',          rectangle: rect(0.88), color: c(2) },
      ],
    },
    {
      id: templateIds.intake,
      user_id: DEV_USER_ID,
      name: 'Client Intake Form',
      file_name: 'Client_Intake_Form.docx',
      file_type: 'word',
      file_url: 'dev/templates/intake.docx',
      uploaded_at: daysAgo(40),
      page_count: 1,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name',    placeholder: '{{Full Name}}',    rectangle: rect(0.14), color: c(0) },
        { id: uuidv4(), fieldName: 'Date of Birth',placeholder: '{{Date of Birth}}',rectangle: rect(0.22), color: c(1) },
        { id: uuidv4(), fieldName: 'Address',      placeholder: '{{Address}}',      rectangle: rect(0.30), color: c(2) },
        { id: uuidv4(), fieldName: 'City',         placeholder: '{{City}}',         rectangle: rect(0.38), color: c(3) },
        { id: uuidv4(), fieldName: 'Province',     placeholder: '{{Province}}',     rectangle: rect(0.44), color: c(4) },
        { id: uuidv4(), fieldName: 'Postal Code',  placeholder: '{{Postal Code}}',  rectangle: rect(0.50), color: c(5) },
        { id: uuidv4(), fieldName: 'Phone',        placeholder: '{{Phone}}',        rectangle: rect(0.58), color: c(6) },
        { id: uuidv4(), fieldName: 'Email',        placeholder: '{{Email}}',        rectangle: rect(0.64), color: c(7) },
        { id: uuidv4(), fieldName: 'Company',      placeholder: '{{Company}}',      rectangle: rect(0.70), color: c(0) },
      ],
    },
    {
      id: templateIds.claim,
      user_id: DEV_USER_ID,
      name: 'Insurance Claim Form',
      file_name: 'Insurance_Claim_Form.pdf',
      file_type: 'pdf',
      file_url: 'dev/templates/claim.pdf',
      uploaded_at: daysAgo(20),
      page_count: 2,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name',        placeholder: '[Full Name]',        rectangle: rect(0.15), color: c(0) },
        { id: uuidv4(), fieldName: 'Policy Number',    placeholder: '[Policy Number]',    rectangle: rect(0.24), color: c(1) },
        { id: uuidv4(), fieldName: 'Date of Incident', placeholder: '[Date of Incident]', rectangle: rect(0.32), color: c(2) },
        { id: uuidv4(), fieldName: 'Address',          placeholder: '[Address]',          rectangle: rect(0.42), color: c(3) },
        { id: uuidv4(), fieldName: 'Phone',            placeholder: '[Phone]',            rectangle: rect(0.50), color: c(4) },
        { id: uuidv4(), fieldName: 'Description',      placeholder: '[Description]',      rectangle: rect(0.60), color: c(5) },
        { id: uuidv4(), fieldName: 'Signature Date',   placeholder: '[Signature Date]',   rectangle: rect(0.88), color: c(6) },
      ],
    },
  ]);

  // ── Client Documents ──────────────────────────────────────────────────────

  await admin.from('client_documents').insert([
    // Sarah Mitchell — 2 docs
    {
      id: uuidv4(), client_id: clientIds.mitchell, user_id: DEV_USER_ID,
      file_name: 'Mitchell_Sarah_GovernmentID.pdf', file_type: 'pdf',
      file_url: 'dev/documents/mitchell_id.pdf', uploaded_at: daysAgo(44), page_count: 1,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name',   value: 'Sarah Mitchell',         rectangle: rect(0.18), color: c(0), confirmed: true },
        { id: uuidv4(), fieldName: 'Date of Birth',value: 'March 12, 1985',        rectangle: rect(0.26), color: c(1), confirmed: true },
        { id: uuidv4(), fieldName: 'Address',     value: '742 Westbrook Avenue',   rectangle: rect(0.34), color: c(2), confirmed: true },
        { id: uuidv4(), fieldName: 'City',        value: 'Montreal',               rectangle: rect(0.40), color: c(3), confirmed: true },
        { id: uuidv4(), fieldName: 'Province',    value: 'QC',                     rectangle: rect(0.46), color: c(4), confirmed: true },
        { id: uuidv4(), fieldName: 'Postal Code', value: 'H3Z 2Y7',                rectangle: rect(0.52), color: c(5), confirmed: true },
      ],
    },
    {
      id: uuidv4(), client_id: clientIds.mitchell, user_id: DEV_USER_ID,
      file_name: 'Mitchell_Retainer_Letter.docx', file_type: 'word',
      file_url: 'dev/documents/mitchell_retainer.docx', uploaded_at: daysAgo(43), page_count: 1,
      fields: [
        { id: uuidv4(), fieldName: 'Client Name', value: 'Sarah Mitchell',         rectangle: rect(0.14), color: c(0), confirmed: true },
        { id: uuidv4(), fieldName: 'Company',     value: 'Horizon Law Group',      rectangle: rect(0.22), color: c(1), confirmed: true },
        { id: uuidv4(), fieldName: 'Email',       value: 'sarah.mitchell@horizonlaw.ca', rectangle: rect(0.30), color: c(2), confirmed: true },
        { id: uuidv4(), fieldName: 'Phone',       value: '514-882-3341',           rectangle: rect(0.38), color: c(3), confirmed: true },
        { id: uuidv4(), fieldName: 'Date',        value: 'February 4, 2026',       rectangle: rect(0.46), color: c(4), confirmed: true },
      ],
    },

    // James Okafor — 1 doc
    {
      id: uuidv4(), client_id: clientIds.okafor, user_id: DEV_USER_ID,
      file_name: 'Okafor_InsuranceCard.pdf', file_type: 'pdf',
      file_url: 'dev/documents/okafor_insurance.pdf', uploaded_at: daysAgo(29), page_count: 1,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name',    value: 'James Okafor',          rectangle: rect(0.20), color: c(0), confirmed: true },
        { id: uuidv4(), fieldName: 'Policy Number',value: 'MSP-2026-00441',        rectangle: rect(0.30), color: c(1), confirmed: true },
        { id: uuidv4(), fieldName: 'Date of Birth',value: 'July 29, 1979',         rectangle: rect(0.40), color: c(2), confirmed: true },
        { id: uuidv4(), fieldName: 'Phone',        value: '438-774-5512',          rectangle: rect(0.50), color: c(3), confirmed: true },
        { id: uuidv4(), fieldName: 'Address',      value: '33 Rue des Pins, Montreal, QC H2W 1P2', rectangle: rect(0.60), color: c(4), confirmed: true },
      ],
    },

    // Priya Sharma — 2 docs
    {
      id: uuidv4(), client_id: clientIds.sharma, user_id: DEV_USER_ID,
      file_name: 'Sharma_CRA_Authorization.pdf', file_type: 'pdf',
      file_url: 'dev/documents/sharma_cra.pdf', uploaded_at: daysAgo(21), page_count: 1,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name',   value: 'Priya Sharma',           rectangle: rect(0.16), color: c(0), confirmed: true },
        { id: uuidv4(), fieldName: 'Date of Birth',value: 'November 3, 1990',      rectangle: rect(0.24), color: c(1), confirmed: true },
        { id: uuidv4(), fieldName: 'Address',     value: '19 Chemin du Boisé',     rectangle: rect(0.32), color: c(2), confirmed: true },
        { id: uuidv4(), fieldName: 'City',        value: 'Laval',                  rectangle: rect(0.38), color: c(3), confirmed: true },
        { id: uuidv4(), fieldName: 'Province',    value: 'QC',                     rectangle: rect(0.44), color: c(4), confirmed: true },
        { id: uuidv4(), fieldName: 'Postal Code', value: 'H7N 4K3',                rectangle: rect(0.50), color: c(5), confirmed: true },
        { id: uuidv4(), fieldName: 'Phone',       value: '450-331-7788',           rectangle: rect(0.56), color: c(6), confirmed: true },
      ],
    },
    {
      id: uuidv4(), client_id: clientIds.sharma, user_id: DEV_USER_ID,
      file_name: 'Sharma_Business_Registration.docx', file_type: 'word',
      file_url: 'dev/documents/sharma_biz.docx', uploaded_at: daysAgo(20), page_count: 1,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name',  value: 'Priya Sharma',            rectangle: rect(0.14), color: c(0), confirmed: true },
        { id: uuidv4(), fieldName: 'Company',    value: 'True North CPA',          rectangle: rect(0.22), color: c(1), confirmed: true },
        { id: uuidv4(), fieldName: 'Address',    value: '19 Chemin du Boisé',      rectangle: rect(0.30), color: c(2), confirmed: true },
        { id: uuidv4(), fieldName: 'City',       value: 'Laval',                   rectangle: rect(0.38), color: c(3), confirmed: true },
        { id: uuidv4(), fieldName: 'Province',   value: 'QC',                      rectangle: rect(0.44), color: c(4), confirmed: true },
        { id: uuidv4(), fieldName: 'Email',      value: 'priya.sharma@truenorthcpa.ca', rectangle: rect(0.52), color: c(5), confirmed: true },
      ],
    },

    // David Chen — 1 doc
    {
      id: uuidv4(), client_id: clientIds.chen, user_id: DEV_USER_ID,
      file_name: 'Chen_PurchaseAgreement.docx', file_type: 'word',
      file_url: 'dev/documents/chen_purchase.docx', uploaded_at: daysAgo(13), page_count: 2,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name',   value: 'David Chen',             rectangle: rect(0.12), color: c(0), confirmed: true },
        { id: uuidv4(), fieldName: 'Company',     value: 'Chen Realty Group',      rectangle: rect(0.20), color: c(1), confirmed: true },
        { id: uuidv4(), fieldName: 'Address',     value: '880 Boulevard René-Lévesque O', rectangle: rect(0.28), color: c(2), confirmed: true },
        { id: uuidv4(), fieldName: 'City',        value: 'Montreal',               rectangle: rect(0.34), color: c(3), confirmed: true },
        { id: uuidv4(), fieldName: 'Province',    value: 'QC',                     rectangle: rect(0.40), color: c(4), confirmed: true },
        { id: uuidv4(), fieldName: 'Postal Code', value: 'H3B 1H7',                rectangle: rect(0.46), color: c(5), confirmed: true },
        { id: uuidv4(), fieldName: 'Phone',       value: '514-901-2244',           rectangle: rect(0.52), color: c(6), confirmed: true },
        { id: uuidv4(), fieldName: 'Email',       value: 'd.chen@chenrealty.com',  rectangle: rect(0.58), color: c(7), confirmed: true },
        { id: uuidv4(), fieldName: 'Date',        value: 'March 7, 2026',          rectangle: rect(0.64), color: c(0), confirmed: true },
      ],
    },

    // Marie Beaumont — 1 doc
    {
      id: uuidv4(), client_id: clientIds.beaumont, user_id: DEV_USER_ID,
      file_name: 'Beaumont_Acte_Notarial.pdf', file_type: 'pdf',
      file_url: 'dev/documents/beaumont_acte.pdf', uploaded_at: daysAgo(7), page_count: 3,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name', value: 'Marie Beaumont',           rectangle: rect(0.18), color: c(0), confirmed: true },
        { id: uuidv4(), fieldName: 'Address',   value: '55 Avenue du Parc, Outremont, QC H2V 4H3', rectangle: rect(0.28), color: c(1), confirmed: true },
        { id: uuidv4(), fieldName: 'Phone',     value: '514-276-8830',             rectangle: rect(0.38), color: c(2), confirmed: true },
        { id: uuidv4(), fieldName: 'Email',     value: 'm.beaumont@beaumontnotaires.ca', rectangle: rect(0.46), color: c(3), confirmed: true },
        { id: uuidv4(), fieldName: 'Date',      value: 'March 14, 2026',           rectangle: rect(0.56), color: c(4), confirmed: true },
      ],
    },

    // Thomas Nguyen — 1 doc
    {
      id: uuidv4(), client_id: clientIds.nguyen, user_id: DEV_USER_ID,
      file_name: 'Nguyen_CommercialAgreement.pdf', file_type: 'pdf',
      file_url: 'dev/documents/nguyen_commercial.pdf', uploaded_at: daysAgo(1), page_count: 2,
      fields: [
        { id: uuidv4(), fieldName: 'Full Name',  value: 'Thomas Nguyen',           rectangle: rect(0.14), color: c(0), confirmed: true },
        { id: uuidv4(), fieldName: 'Company',    value: 'Nguyen Logistics Inc.',   rectangle: rect(0.22), color: c(1), confirmed: true },
        { id: uuidv4(), fieldName: 'Address',    value: '1200 Rue Sainte-Catherine O', rectangle: rect(0.30), color: c(2), confirmed: true },
        { id: uuidv4(), fieldName: 'Phone',      value: '438-990-1155',            rectangle: rect(0.38), color: c(3), confirmed: true },
        { id: uuidv4(), fieldName: 'Email',      value: 't.nguyen@nguyenlogistics.com', rectangle: rect(0.46), color: c(4), confirmed: true },
        { id: uuidv4(), fieldName: 'Date',       value: 'March 20, 2026',          rectangle: rect(0.54), color: c(5), confirmed: true },
      ],
    },
  ]);

  return NextResponse.json({ ok: true, message: 'Demo data seeded successfully.' });
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
