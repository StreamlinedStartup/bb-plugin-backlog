import { experimental_ProviderIcon as ProviderIcon, experimental_useProviders as useProviders } from "@get-bb/plugin-sdk/app";
import { assigneeProvider, initials } from "./task-relations";

function AgentMark({ id, name }: { id: string; name: string }) {
 const { providers } = useProviders();
 const provider = providers.find(candidate => candidate.id === id);
 return provider ? <ProviderIcon providerKind="agent" provider={provider} className="assignee-provider-icon" aria-hidden="true" /> : <>{initials(name)}</>;
}
export default function AssigneeAvatar({ name }: { name: string }) {
 const provider = assigneeProvider(name);
 return <span className="person-avatar" title={name} aria-label={name}>
  {provider ? <AgentMark id={provider} name={name} /> : initials(name)}
 </span>;
}
