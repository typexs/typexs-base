export interface NetworkInterfaceBase {
  address: string;
  netmask: string;
  mac: string;
  internal: boolean;
  cidr: string | null;
}

export interface NetworkInterfaceInfoIPv4 extends NetworkInterfaceBase {
  family: 'IPv4';
}

export interface NetworkInterfaceInfoIPv6 extends NetworkInterfaceBase {
  family: 'IPv6';
  scopeid: number;
}

export type NetworkInterfaceInfo = NetworkInterfaceInfoIPv4 | NetworkInterfaceInfoIPv6;

export interface CpuInfo {
  model: string;
  speed: number;
  times: {
    user: number;
    nice: number;
    sys: number;
    idle: number;
    irq: number;
  };
}

export interface IMemory {
  total: number;
  free: number;

}

export interface ProcessVersions {
  http_parser: string;
  node: string;
  v8: string;
  ares: string;
  uv: string;
  zlib: string;
  modules: string;
  openssl: string;
}

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}

export interface CpuUsage {
  user: number;
  system: number;
}

export class NodeRuntimeInfo {
  machineId: string;

  nodeId: string;

  hostname: string;

  networks: { [index: string]: NetworkInterfaceInfo[] };

  cpus: CpuInfo[];

  memory: IMemory;

  uptime: number;

  arch: string;

  release: string;

  loadavg: number[];

  versions: ProcessVersions;

  memoryUsage: MemoryUsage;

  cpuUsage: CpuUsage;
}
