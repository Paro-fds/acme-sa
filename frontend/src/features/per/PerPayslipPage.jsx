import Payslips from './Payslips.jsx'
import { PerDocumentPage } from './perParts.jsx'

/** US-1022, US-1023 : la fiche de paie, sur sa page. */
export default function PerPayslipPage() {
  return (
    <PerDocumentPage title="Fiche de paie">
      <Payslips />
    </PerDocumentPage>
  )
}
