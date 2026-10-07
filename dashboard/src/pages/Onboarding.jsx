import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const PROFESSIONS = ['student', 'developer', 'designer', 'teacher', 'other'];

export default function Onboarding() {
  const { lang, setProfile, completeOnboarding } = useApp();
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('student');
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState([]);
  const [hobbyInput, setHobbyInput] = useState('');
  const [hobbies, setHobbies] = useState([]);

  const handleAddInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (item) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const handleAddHobby = () => {
    if (hobbyInput.trim() && !hobbies.includes(hobbyInput.trim())) {
      setHobbies([...hobbies, hobbyInput.trim()]);
      setHobbyInput('');
    }
  };

  const handleRemoveHobby = (item) => {
    setHobbies(hobbies.filter((h) => h !== item));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setProfile({
      name: name.trim() || 'Friend',
      profession,
      interests,
      hobbies,
    });
    completeOnboarding();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-lg p-6 border border-stone-200 dark:border-stone-800">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-stone-900 dark:text-stone-100">
            {t(lang, 'onboarding.welcome')}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Set up your profile to personalize attention tracking and reflections.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              {t(lang, 'onboarding.nameLabel')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(lang, 'onboarding.namePlaceholder')}
              className="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:border-stone-500"
            />
          </div>

          {/* Profession */}
          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              {t(lang, 'onboarding.professionLabel')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PROFESSIONS.map((prof) => (
                <button
                  type="button"
                  key={prof}
                  onClick={() => setProfession(prof)}
                  className={`px-2.5 py-1 text-xs rounded border transition ${
                    profession === prof
                      ? 'border-stone-800 dark:border-stone-200 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 font-medium'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-400'
                  }`}
                >
                  {t(lang, `onboarding.professionOptions.${prof}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              {t(lang, 'onboarding.interestsLabel')}
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
                placeholder={t(lang, 'onboarding.interestsPlaceholder')}
                className="flex-1 px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:border-stone-500"
              />
              <button
                type="button"
                onClick={handleAddInterest}
                className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs rounded hover:bg-stone-200 dark:hover:bg-stone-700"
              >
                {t(lang, 'onboarding.addChip')}
              </button>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {interests.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(item)}
                      className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Hobbies */}
          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              {t(lang, 'onboarding.hobbiesLabel')}
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={hobbyInput}
                onChange={(e) => setHobbyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHobby();
                  }
                }}
                placeholder={t(lang, 'onboarding.hobbiesPlaceholder')}
                className="flex-1 px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:border-stone-500"
              />
              <button
                type="button"
                onClick={handleAddHobby}
                className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs rounded hover:bg-stone-200 dark:hover:bg-stone-700"
              >
                {t(lang, 'onboarding.addChip')}
              </button>
            </div>
            {hobbies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {hobbies.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveHobby(item)}
                      className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-medium text-xs rounded transition"
            >
              {t(lang, 'onboarding.continue')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
