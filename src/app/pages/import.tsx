import React from "react"
import { useNavigate } from "react-router-dom"
import { PageBody, PageContainer, PageHeader, PageHeading } from "~components/PageContainer"
import { ImportAccountForm } from "~components/ImportAccountForm"
import type { WalletAccount } from "~/types/account"

export function ImportPage() {
  const navigate = useNavigate()

  const handleImportSuccess = (accounts: WalletAccount[]) => {
    // Navigate back to accounts page
    navigate('/accounts')
  }

  const handleCancel = () => {
    // Navigate back to accounts page
    navigate('/accounts')
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeading>Import Wallet</PageHeading>
      </PageHeader>
      <PageBody>
        <ImportAccountForm
          onImportSuccess={handleImportSuccess}
          onCancel={handleCancel}
          showCancelButton={false}
        />
      </PageBody>
    </PageContainer>
  )
}
