import {Button, Heading, Text, TextField} from "@radix-ui/themes/dist/esm";
import {ExplainSeedPhrase} from "~components/dialogs/ExplainSeedPhrase";
import React, {useState} from "react";
import {Flex} from "@radix-ui/themes";

export default function VerifySeedPhrase(
  {
    randomIndices,
    words,
    setError,
    setStep
  } : {
    randomIndices: number[],
    words: string[],
    setError: any,
    setStep: any
  }) {
  const [verifyWords, setVerifyWords] = useState<{ [key: number]: string }>({})

  const handleVerify = () => {
    setError("")

    // Check if all words are correct
    for (const index of randomIndices) {
      if (verifyWords[index]?.toLowerCase().trim() !== words[index]) {
        setError(`Word #${index + 1} is incorrect`)
        return
      }
    }

    setStep('complete')
  }

  return (
    <Flex direction={'column'} gap={'6'}>
      <div className="text-center space-y-2">
        {/*<div className="text-6xl mb-4">✅</div>*/}
        <Heading size={'7'} className="" wrap={'pretty'}>
          Verification Phase
        </Heading>

        <Text size={'2'} color={'gray'}>
          Confirm you have saved your Seed phrase
        </Text>

        <ExplainSeedPhrase />
      </div>

      <div className="space-y-6 mb-6">
        {randomIndices.map((index) => (
          <div key={index} className={''}>
            <label className={'px-1 block'}>
              <Text as="div" size="2" mb="1" weight="bold">
                Word #{index + 1}
              </Text>
              <TextField.Root
                autoFocus
                autoComplete="off"
                required
                className={'h-[56px]'}
                placeholder={`Enter word #${index + 1}`}
                size={'3'}
                type={'text'}
                value={verifyWords[index] || ''}
                variant="soft"
                onChange={(e) => setVerifyWords({ ...verifyWords, [index]: e.target.value })}
              />
            </label>
            {/*<input
              type="text"
              value={verifyWords[index] || ''}
              onChange={(e) => setVerifyWords({ ...verifyWords, [index]: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={`Enter word #${index + 1}`}
              autoComplete="off"
            />*/}
          </div>
        ))}
      </div>

      {/*{error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}*/}

      <div className="flex gap-3">
        <Button
          highContrast
          className={'flex-1'}
          size={'2'}
          onClick={() => setStep('display')}
          // className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
        >
          Back
        </Button>
        <Button
          className={'flex-1'}
          color={'grass'}
          disabled={!randomIndices.every(index => verifyWords[index]?.trim())}
          onClick={handleVerify}
          // className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
        >
          Verify
        </Button>
      </div>
    </Flex>
  )
}
